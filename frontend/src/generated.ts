//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TrustLayer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299)
 */
export const trustLayerAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'FALLBACK_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_MILESTONES',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'POLICY_VERSION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRIMARY_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REVIEW_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REVISION_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SUBMISSION_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'termsHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'acceptAsArbiter',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'termsHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'acceptAsFreelancer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'agreementCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'cancelBeforeFunding',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'client', internalType: 'address', type: 'address' },
      { name: 'freelancer', internalType: 'address', type: 'address' },
      { name: 'primaryArbiter', internalType: 'address', type: 'address' },
      { name: 'fallbackArbiter', internalType: 'address', type: 'address' },
      {
        name: 'milestones',
        internalType: 'struct TrustLayer.MilestoneInput[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'deliverableHash', internalType: 'bytes32', type: 'bytes32' },
          { name: 'criteriaHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'computeTermsHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'freelancer', internalType: 'address', type: 'address' },
      { name: 'primaryArbiter', internalType: 'address', type: 'address' },
      { name: 'fallbackArbiter', internalType: 'address', type: 'address' },
      {
        name: 'milestones',
        internalType: 'struct TrustLayer.MilestoneInput[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'deliverableHash', internalType: 'bytes32', type: 'bytes32' },
          { name: 'criteriaHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'create',
    outputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'defaultSplit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'endAfterCurrent',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'expireFreelancerWindow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'fund',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'getAgreement',
    outputs: [
      {
        name: '',
        internalType: 'struct TrustLayer.Agreement',
        type: 'tuple',
        components: [
          { name: 'client', internalType: 'address', type: 'address' },
          {
            name: 'status',
            internalType: 'enum TrustLayer.Status',
            type: 'uint8',
          },
          {
            name: 'phase',
            internalType: 'enum TrustLayer.Phase',
            type: 'uint8',
          },
          { name: 'currentIndex', internalType: 'uint8', type: 'uint8' },
          { name: 'endIndex', internalType: 'uint8', type: 'uint8' },
          { name: 'count', internalType: 'uint8', type: 'uint8' },
          { name: 'freelancerAccepted', internalType: 'bool', type: 'bool' },
          { name: 'primaryAccepted', internalType: 'bool', type: 'bool' },
          { name: 'fallbackAccepted', internalType: 'bool', type: 'bool' },
          { name: 'freelancer', internalType: 'address', type: 'address' },
          { name: 'phaseDeadline', internalType: 'uint40', type: 'uint40' },
          { name: 'disputeOpenedAt', internalType: 'uint40', type: 'uint40' },
          { name: 'primaryArbiter', internalType: 'address', type: 'address' },
          { name: 'fallbackArbiter', internalType: 'address', type: 'address' },
          { name: 'locked', internalType: 'uint128', type: 'uint128' },
          { name: 'clientCredit', internalType: 'uint128', type: 'uint128' },
          {
            name: 'freelancerCredit',
            internalType: 'uint128',
            type: 'uint128',
          },
          { name: 'total', internalType: 'uint128', type: 'uint128' },
          { name: 'termsHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'getMilestoneAmounts',
    outputs: [{ name: '', internalType: 'uint128[]', type: 'uint128[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'milestoneAmount',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'milestoneStatus',
    outputs: [
      {
        name: '',
        internalType: 'enum TrustLayer.MilestoneStatus',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'reasonHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'requestRevision',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'freelancerAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'resolve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'evidenceHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'submit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AgreementAccepted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'reason',
        internalType: 'enum TrustLayer.CancelReason',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'futureRefundToClient',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AgreementCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
    ],
    name: 'AgreementCompleted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'client',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'freelancer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'primaryArbiter',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'fallbackArbiter',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'termsHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'total',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'milestones',
        internalType: 'struct TrustLayer.MilestoneInput[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'deliverableHash', internalType: 'bytes32', type: 'bytes32' },
          { name: 'criteriaHash', internalType: 'bytes32', type: 'bytes32' },
        ],
        indexed: false,
      },
    ],
    name: 'AgreementCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'total',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AgreementFunded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'openedBy',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'primaryDeadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'fallbackDeadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DisputeOpened',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'refundedToClient',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EndedAfterCurrent',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'clientAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'freelancerAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'enum TrustLayer.SettlementReason',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'MilestoneSettled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'evidenceHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'reviewDeadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'MilestoneSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reasonHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'responseDeadline',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RevisionRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Withdrawal',
  },
  { type: 'error', inputs: [], name: 'AgreementNotFound' },
  { type: 'error', inputs: [], name: 'AlreadyAccepted' },
  { type: 'error', inputs: [], name: 'DeadlineNotReached' },
  { type: 'error', inputs: [], name: 'DeadlinePassed' },
  { type: 'error', inputs: [], name: 'InvalidAllocation' },
  { type: 'error', inputs: [], name: 'InvalidAmount' },
  { type: 'error', inputs: [], name: 'InvalidHash' },
  { type: 'error', inputs: [], name: 'InvalidMilestoneCount' },
  { type: 'error', inputs: [], name: 'InvalidParticipants' },
  { type: 'error', inputs: [], name: 'InvalidRecipient' },
  { type: 'error', inputs: [], name: 'NoCredit' },
  { type: 'error', inputs: [], name: 'NotAllAccepted' },
  { type: 'error', inputs: [], name: 'NotArbiter' },
  { type: 'error', inputs: [], name: 'NotAuthorized' },
  { type: 'error', inputs: [], name: 'NotClient' },
  { type: 'error', inputs: [], name: 'NotFreelancer' },
  { type: 'error', inputs: [], name: 'NotParticipant' },
  { type: 'error', inputs: [], name: 'NothingToEnd' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'TermsMismatch' },
  { type: 'error', inputs: [], name: 'TotalTooLarge' },
  { type: 'error', inputs: [], name: 'TransferFailed' },
  { type: 'error', inputs: [], name: 'WindowNotOpen' },
  { type: 'error', inputs: [], name: 'WrongFundingAmount' },
  { type: 'error', inputs: [], name: 'WrongPhase' },
  { type: 'error', inputs: [], name: 'WrongStatus' },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299)
 */
export const trustLayerAddress = {
  11155111: '0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299)
 */
export const trustLayerConfig = {
  address: trustLayerAddress,
  abi: trustLayerAbi,
} as const
