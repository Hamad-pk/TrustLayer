// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TrustLayer
/// @notice Milestone-based ETH escrow between a client and a freelancer, with two nominated arbiters.
/// @dev Unaudited portfolio project. See docs/ for the specification this contract implements.
///      No owner, no admin, no upgrade path, no sweep. The contract never reads its own balance.
contract TrustLayer is ReentrancyGuard {
    // ------------------------------------------------------------------ types

    enum Status {
        None,
        Proposed,
        Active,
        Completed,
        Cancelled
    }

    enum Phase {
        Working,
        Submitted,
        RevisionRequested,
        Disputed
    }

    enum MilestoneStatus {
        Pending,
        Working,
        Submitted,
        RevisionRequested,
        Disputed,
        Settled,
        Voided
    }

    enum SettlementReason {
        Approved,
        PrimaryRuling,
        FallbackRuling,
        DefaultSplit,
        FreelancerTimeout
    }

    enum CancelReason {
        BeforeFunding,
        FreelancerTimeout
    }

    struct MilestoneInput {
        uint128 amount;
        bytes32 deliverableHash;
        bytes32 criteriaHash;
    }

    struct Agreement {
        // slot 0
        address client;
        Status status;
        Phase phase;
        uint8 currentIndex;
        uint8 endIndex;
        uint8 count;
        bool freelancerAccepted;
        bool primaryAccepted;
        bool fallbackAccepted;
        // slot 1
        address freelancer;
        uint40 phaseDeadline;
        uint40 disputeOpenedAt;
        // slots 2-3
        address primaryArbiter;
        address fallbackArbiter;
        // slots 4-5
        uint128 locked;
        uint128 clientCredit;
        uint128 freelancerCredit;
        uint128 total;
        // slot 6
        bytes32 termsHash;
    }

    // -------------------------------------------------------------- constants

    uint256 public constant MAX_MILESTONES = 20;
    uint256 public constant POLICY_VERSION = 1;
    uint256 public constant SUBMISSION_WINDOW = 14 days;
    uint256 public constant REVIEW_WINDOW = 7 days;
    uint256 public constant REVISION_WINDOW = 14 days;
    uint256 public constant PRIMARY_WINDOW = 14 days;
    uint256 public constant FALLBACK_WINDOW = 14 days;

    // ---------------------------------------------------------------- storage

    uint256 public agreementCount;
    mapping(uint256 id => Agreement) private _agreements;
    // slither-disable-next-line uninitialized-state -- written via push() in _storeMilestones; Slither does not follow it
    mapping(uint256 id => uint128[]) private _amounts;

    // ----------------------------------------------------------------- events

    event AgreementCreated(
        uint256 indexed id,
        address indexed client,
        address indexed freelancer,
        address primaryArbiter,
        address fallbackArbiter,
        bytes32 termsHash,
        uint256 total,
        MilestoneInput[] milestones
    );
    event AgreementAccepted(uint256 indexed id, address indexed account);
    event AgreementFunded(uint256 indexed id, uint256 total);
    event MilestoneSubmitted(uint256 indexed id, uint256 indexed index, bytes32 evidenceHash, uint256 reviewDeadline);
    event RevisionRequested(uint256 indexed id, uint256 indexed index, bytes32 reasonHash, uint256 responseDeadline);
    event DisputeOpened(
        uint256 indexed id,
        uint256 indexed index,
        address indexed openedBy,
        uint256 primaryDeadline,
        uint256 fallbackDeadline
    );
    event MilestoneSettled(
        uint256 indexed id,
        uint256 indexed index,
        uint256 clientAmount,
        uint256 freelancerAmount,
        SettlementReason reason
    );
    event EndedAfterCurrent(uint256 indexed id, uint256 indexed index, uint256 refundedToClient);
    event AgreementCancelled(uint256 indexed id, CancelReason reason, uint256 futureRefundToClient);
    event AgreementCompleted(uint256 indexed id);
    event Withdrawal(uint256 indexed id, address indexed account, address to, uint256 amount);

    // ----------------------------------------------------------------- errors

    error AgreementNotFound();
    error InvalidParticipants();
    error InvalidMilestoneCount();
    error InvalidAmount();
    error InvalidHash();
    error TotalTooLarge();
    error WrongStatus();
    error WrongPhase();
    error NotClient();
    error NotFreelancer();
    error NotArbiter();
    error NotAuthorized();
    error NotParticipant();
    error AlreadyAccepted();
    error TermsMismatch();
    error NotAllAccepted();
    error WrongFundingAmount();
    error DeadlinePassed();
    error DeadlineNotReached();
    error WindowNotOpen();
    error InvalidAllocation();
    error NothingToEnd();
    error NoCredit();
    error InvalidRecipient();
    error TransferFailed();

    // --------------------------------------------------------------- creation

    /// @notice Create an agreement. The caller is the client. Terms are immutable from this point.
    function create(
        address freelancer,
        address primaryArbiter,
        address fallbackArbiter,
        MilestoneInput[] calldata milestones
    ) external returns (uint256 id) {
        _validateParticipants(msg.sender, freelancer, primaryArbiter, fallbackArbiter);
        if (milestones.length == 0 || milestones.length > MAX_MILESTONES) revert InvalidMilestoneCount();

        id = ++agreementCount;
        uint256 total = _storeMilestones(id, milestones);

        Agreement storage a = _agreements[id];
        a.client = msg.sender;
        a.freelancer = freelancer;
        a.primaryArbiter = primaryArbiter;
        a.fallbackArbiter = fallbackArbiter;
        a.status = Status.Proposed;
        a.count = uint8(milestones.length);
        a.endIndex = uint8(milestones.length - 1);
        a.total = uint128(total);
        a.termsHash = computeTermsHash(id, msg.sender, freelancer, primaryArbiter, fallbackArbiter, milestones);

        _emitCreated(id, a, total, milestones);
    }

    function _validateParticipants(address client, address freelancer, address primary, address fallbackArb)
        private
        pure
    {
        if (freelancer == address(0) || primary == address(0) || fallbackArb == address(0)) {
            revert InvalidParticipants();
        }
        if (
            client == freelancer || client == primary || client == fallbackArb || freelancer == primary
                || freelancer == fallbackArb || primary == fallbackArb
        ) revert InvalidParticipants();
    }

    function _storeMilestones(uint256 id, MilestoneInput[] calldata milestones) private returns (uint256 total) {
        uint128[] storage amts = _amounts[id];
        for (uint256 i; i < milestones.length; ++i) {
            MilestoneInput calldata m = milestones[i];
            if (m.amount == 0) revert InvalidAmount();
            if (m.deliverableHash == bytes32(0) || m.criteriaHash == bytes32(0)) revert InvalidHash();
            total += m.amount; // at most 20 * (2^128 - 1): cannot overflow uint256
            amts.push(m.amount);
        }
        if (total > type(uint128).max) revert TotalTooLarge();
    }

    function _emitCreated(uint256 id, Agreement storage a, uint256 total, MilestoneInput[] calldata milestones)
        private
    {
        emit AgreementCreated(
            id, a.client, a.freelancer, a.primaryArbiter, a.fallbackArbiter, a.termsHash, total, milestones
        );
    }

    /// @notice Canonical terms hash. Acceptors should compute this independently off-chain from the documents they hold.
    function computeTermsHash(
        uint256 id,
        address client,
        address freelancer,
        address primaryArbiter,
        address fallbackArbiter,
        MilestoneInput[] calldata milestones
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                block.chainid,
                address(this),
                id,
                client,
                freelancer,
                primaryArbiter,
                fallbackArbiter,
                POLICY_VERSION,
                milestones
            )
        );
    }

    function acceptAsFreelancer(uint256 id, bytes32 termsHash) external {
        Agreement storage a = _proposed(id);
        if (msg.sender != a.freelancer) revert NotFreelancer();
        if (a.termsHash != termsHash) revert TermsMismatch();
        if (a.freelancerAccepted) revert AlreadyAccepted();
        a.freelancerAccepted = true;
        emit AgreementAccepted(id, msg.sender);
    }

    function acceptAsArbiter(uint256 id, bytes32 termsHash) external {
        Agreement storage a = _proposed(id);
        if (a.termsHash != termsHash) {
            // Role check first for a clearer error when a stranger calls.
            if (msg.sender != a.primaryArbiter && msg.sender != a.fallbackArbiter) revert NotArbiter();
            revert TermsMismatch();
        }
        if (msg.sender == a.primaryArbiter) {
            if (a.primaryAccepted) revert AlreadyAccepted();
            a.primaryAccepted = true;
        } else if (msg.sender == a.fallbackArbiter) {
            if (a.fallbackAccepted) revert AlreadyAccepted();
            a.fallbackAccepted = true;
        } else {
            revert NotArbiter();
        }
        emit AgreementAccepted(id, msg.sender);
    }

    /// @notice Cancel before funding. Doubles as a decline by the freelancer or either arbiter.
    function cancelBeforeFunding(uint256 id) external {
        Agreement storage a = _proposed(id);
        if (
            msg.sender != a.client && msg.sender != a.freelancer && msg.sender != a.primaryArbiter
                && msg.sender != a.fallbackArbiter
        ) revert NotParticipant();
        a.status = Status.Cancelled;
        emit AgreementCancelled(id, CancelReason.BeforeFunding, 0);
    }

    /// @notice Fund the agreement with exactly the sum of milestone amounts. Activates milestone 0.
    function fund(uint256 id) external payable {
        Agreement storage a = _proposed(id);
        if (msg.sender != a.client) revert NotClient();
        if (!(a.freelancerAccepted && a.primaryAccepted && a.fallbackAccepted)) revert NotAllAccepted();
        if (msg.value != a.total) revert WrongFundingAmount();

        a.status = Status.Active;
        a.phase = Phase.Working;
        a.locked = a.total;
        a.phaseDeadline = uint40(block.timestamp + SUBMISSION_WINDOW);
        emit AgreementFunded(id, msg.value);
    }

    // ------------------------------------------------------------------- work

    /// @notice Submit (or resubmit) work for the current milestone. Identical evidence may be resubmitted.
    function submit(uint256 id, bytes32 evidenceHash) external {
        Agreement storage a = _active(id);
        if (msg.sender != a.freelancer) revert NotFreelancer();
        if (a.phase != Phase.Working && a.phase != Phase.RevisionRequested) revert WrongPhase();
        if (block.timestamp >= a.phaseDeadline) revert DeadlinePassed();
        if (evidenceHash == bytes32(0)) revert InvalidHash();

        a.phase = Phase.Submitted;
        uint40 reviewDeadline = uint40(block.timestamp + REVIEW_WINDOW);
        a.phaseDeadline = reviewDeadline;
        emit MilestoneSubmitted(id, a.currentIndex, evidenceHash, reviewDeadline);
    }

    /// @notice Approve the submission. Allowed at any time until a dispute opens, including after the review deadline.
    function approve(uint256 id) external {
        Agreement storage a = _active(id);
        if (msg.sender != a.client) revert NotClient();
        if (a.phase != Phase.Submitted) revert WrongPhase();
        uint256 amount = _amounts[id][a.currentIndex];
        _settle(id, a, 0, amount, SettlementReason.Approved);
    }

    function requestRevision(uint256 id, bytes32 reasonHash) external {
        Agreement storage a = _active(id);
        if (msg.sender != a.client) revert NotClient();
        if (a.phase != Phase.Submitted) revert WrongPhase();
        if (block.timestamp >= a.phaseDeadline) revert DeadlinePassed();
        if (reasonHash == bytes32(0)) revert InvalidHash();

        a.phase = Phase.RevisionRequested;
        uint40 responseDeadline = uint40(block.timestamp + REVISION_WINDOW);
        a.phaseDeadline = responseDeadline;
        emit RevisionRequested(id, a.currentIndex, reasonHash, responseDeadline);
    }

    // --------------------------------------------------------------- disputes

    /// @notice Open a dispute. Client: when Submitted. Freelancer: when Submitted after the review deadline,
    ///         or when RevisionRequested. No one else.
    function openDispute(uint256 id) external {
        Agreement storage a = _active(id);
        if (a.phase == Phase.Submitted) {
            if (msg.sender == a.client) {
                // allowed at any time
            } else if (msg.sender == a.freelancer) {
                if (block.timestamp < a.phaseDeadline) revert DeadlineNotReached();
            } else {
                revert NotAuthorized();
            }
        } else if (a.phase == Phase.RevisionRequested) {
            if (msg.sender != a.freelancer) revert NotAuthorized();
        } else {
            revert WrongPhase();
        }

        a.phase = Phase.Disputed;
        a.disputeOpenedAt = uint40(block.timestamp);
        a.phaseDeadline = 0;
        emit DisputeOpened(
            id,
            a.currentIndex,
            msg.sender,
            block.timestamp + PRIMARY_WINDOW,
            block.timestamp + PRIMARY_WINDOW + FALLBACK_WINDOW
        );
    }

    /// @notice Arbiter ruling. The arbiter chooses only how much the freelancer receives; the client gets the rest.
    function resolve(uint256 id, uint256 freelancerAmount) external {
        Agreement storage a = _active(id);
        if (a.phase != Phase.Disputed) revert WrongPhase();

        uint256 opened = a.disputeOpenedAt;
        // slither-disable-next-line uninitialized-local -- assigned in every branch that does not revert
        SettlementReason reason;
        if (block.timestamp < opened + PRIMARY_WINDOW) {
            if (msg.sender != a.primaryArbiter) revert NotArbiter();
            reason = SettlementReason.PrimaryRuling;
        } else if (block.timestamp < opened + PRIMARY_WINDOW + FALLBACK_WINDOW) {
            if (msg.sender != a.fallbackArbiter) revert NotArbiter();
            reason = SettlementReason.FallbackRuling;
        } else {
            revert WindowNotOpen();
        }

        uint256 amount = _amounts[id][a.currentIndex];
        if (freelancerAmount > amount) revert InvalidAllocation();
        _settle(id, a, amount - freelancerAmount, freelancerAmount, reason);
    }

    /// @notice Permissionless 50/50 split after both arbiter windows lapse. Odd wei goes to the freelancer.
    function defaultSplit(uint256 id) external {
        Agreement storage a = _active(id);
        if (a.phase != Phase.Disputed) revert WrongPhase();
        if (block.timestamp < uint256(a.disputeOpenedAt) + PRIMARY_WINDOW + FALLBACK_WINDOW) {
            revert DeadlineNotReached();
        }
        uint256 amount = _amounts[id][a.currentIndex];
        uint256 clientShare = amount / 2;
        _settle(id, a, clientShare, amount - clientShare, SettlementReason.DefaultSplit);
    }

    // ------------------------------------------------------ inactivity / exits

    /// @notice Permissionless. If the freelancer missed a submission or revision-response deadline, the current and
    ///         all future milestones are refunded to the client and the agreement is cancelled.
    function expireFreelancerWindow(uint256 id) external {
        Agreement storage a = _active(id);
        if (a.phase != Phase.Working && a.phase != Phase.RevisionRequested) revert WrongPhase();
        if (block.timestamp < a.phaseDeadline) revert DeadlineNotReached();

        uint256 index = a.currentIndex;
        uint256 currentAmount = _amounts[id][index];
        uint128 lockedAll = a.locked;

        a.clientCredit += lockedAll;
        a.locked = 0;
        a.currentIndex = uint8(index + 1);
        a.status = Status.Cancelled;

        emit MilestoneSettled(id, index, currentAmount, 0, SettlementReason.FreelancerTimeout);
        emit AgreementCancelled(id, CancelReason.FreelancerTimeout, lockedAll - currentAmount);
    }

    /// @notice Client-only. Refunds every future milestone now; the current milestone finishes normally,
    ///         including any open dispute. The agreement completes when it settles.
    function endAfterCurrent(uint256 id) external {
        Agreement storage a = _active(id);
        if (msg.sender != a.client) revert NotClient();
        if (a.endIndex <= a.currentIndex) revert NothingToEnd();

        uint128 currentAmount = _amounts[id][a.currentIndex];
        uint128 refund = a.locked - currentAmount;
        a.clientCredit += refund;
        a.locked = currentAmount;
        a.endIndex = a.currentIndex;
        emit EndedAfterCurrent(id, a.currentIndex, refund);
    }

    // ------------------------------------------------------------- withdrawal

    /// @notice Withdraw the caller's own credit for this agreement to `to`. Only the credited party may call.
    function withdraw(uint256 id, address to) external nonReentrant {
        Agreement storage a = _agreements[id];
        if (a.status == Status.None) revert AgreementNotFound();
        if (to == address(0) || to == address(this)) revert InvalidRecipient();

        // slither-disable-next-line uninitialized-local -- assigned in every branch that does not revert
        uint128 amount;
        if (msg.sender == a.client) {
            amount = a.clientCredit;
            a.clientCredit = 0;
        } else if (msg.sender == a.freelancer) {
            amount = a.freelancerCredit;
            a.freelancerCredit = 0;
        } else {
            revert NotParticipant();
        }
        if (amount == 0) revert NoCredit();

        emit Withdrawal(id, msg.sender, to, amount);
        // slither-disable-next-line low-level-calls -- intended: plain ETH send, result checked, reentrancy-guarded
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ------------------------------------------------------------------ views

    function getAgreement(uint256 id) external view returns (Agreement memory) {
        Agreement memory a = _agreements[id];
        if (a.status == Status.None) revert AgreementNotFound();
        return a;
    }

    function getMilestoneAmounts(uint256 id) external view returns (uint128[] memory) {
        return _amounts[id];
    }

    function milestoneAmount(uint256 id, uint256 index) external view returns (uint128) {
        return _amounts[id][index];
    }

    function milestoneStatus(uint256 id, uint256 index) external view returns (MilestoneStatus) {
        Agreement storage a = _agreements[id];
        if (a.status == Status.None) revert AgreementNotFound();
        if (index >= a.count) revert InvalidMilestoneCount();
        if (index < a.currentIndex) return MilestoneStatus.Settled;
        if (a.status == Status.Active) {
            if (index > a.endIndex) return MilestoneStatus.Voided;
            if (index == a.currentIndex) {
                if (a.phase == Phase.Working) return MilestoneStatus.Working;
                if (a.phase == Phase.Submitted) return MilestoneStatus.Submitted;
                if (a.phase == Phase.RevisionRequested) return MilestoneStatus.RevisionRequested;
                return MilestoneStatus.Disputed;
            }
            return MilestoneStatus.Pending;
        }
        if (a.status == Status.Proposed) return MilestoneStatus.Pending;
        return MilestoneStatus.Voided;
    }

    // --------------------------------------------------------------- internals

    function _proposed(uint256 id) private view returns (Agreement storage a) {
        a = _agreements[id];
        if (a.status == Status.None) revert AgreementNotFound();
        if (a.status != Status.Proposed) revert WrongStatus();
    }

    function _active(uint256 id) private view returns (Agreement storage a) {
        a = _agreements[id];
        if (a.status == Status.None) revert AgreementNotFound();
        if (a.status != Status.Active) revert WrongStatus();
    }

    /// @dev The single settlement path for approvals, rulings and default splits.
    ///      Moves the current milestone's amount from locked into credits, then advances or completes.
    function _settle(
        uint256 id,
        Agreement storage a,
        uint256 clientAmount,
        uint256 freelancerAmount,
        SettlementReason reason
    ) private {
        uint256 index = a.currentIndex;
        a.locked -= uint128(clientAmount + freelancerAmount);
        a.clientCredit += uint128(clientAmount);
        a.freelancerCredit += uint128(freelancerAmount);
        a.currentIndex = uint8(index + 1);
        emit MilestoneSettled(id, index, clientAmount, freelancerAmount, reason);

        if (index == a.endIndex) {
            a.status = Status.Completed;
            emit AgreementCompleted(id);
        } else {
            a.phase = Phase.Working;
            a.disputeOpenedAt = 0;
            a.phaseDeadline = uint40(block.timestamp + SUBMISSION_WINDOW);
        }
    }
}
