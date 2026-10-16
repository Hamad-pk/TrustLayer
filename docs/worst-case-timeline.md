# Worst-Case Timeline

Assumption: every party with a stake acts at the first moment an action becomes available, and every needed transaction is mined. A passing deadline does not execute anything.

## Per milestone, from activation to allocation

| Path | Calculation | Total |
|---|---|---|
| Freelancer never submits | 14d, then any account triggers the refund | **14 days** |
| Client silent after submission | 14d (submits at the last moment) + 7d (review) + 28d (arbiters silent, then default) | **49 days** |
| Client requests revision, freelancer escalates | up to 14d + up to 7d + freelancer disputes immediately + 28d | at most **49 days** |
| Freelancer silent after a revision request | up to 14d + up to 7d + 14d | at most **35 days** |
| Client disputes immediately | 14d + 0 + 28d | at most 42 days |

A revision request does not reset the freelancer's escalation right, so cooperative revision loops do not extend the unilateral bound. A loop continues only while both parties choose to continue.

## Whole agreement

`49 days x 20 milestones = 980 days` if every milestone follows the slowest unilateral path. The client can shorten this at any time with `endAfterCurrent`, which stops future milestones from starting.

## Limits of this bound

- It covers only transactions someone must still send.
- It does not cover the `Submitted` case where both parties stay silent forever.
- Block-timestamp coarseness shifts deadlines by seconds, not days.