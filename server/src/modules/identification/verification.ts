import { RequestStatus, ReviewDecision, VERIFICATION_RULE } from './constants';

export interface ReviewLike {
  decision: ReviewDecision | string;
  isExpert: boolean;
}

export interface ProposalLike {
  id: number;
  taxonId: number;
  /** The proposer implicitly agrees with their own identification. */
  isExpert: boolean;
  reviews: ReviewLike[];
}

export interface ProposalTally {
  agree: number;
  disagree: number;
  expertAgree: number;
  expertDisagree: number;
  verified: boolean;
}

export function tallyProposal(p: ProposalLike): ProposalTally {
  const votes = [{ decision: 'agree', isExpert: p.isExpert }, ...p.reviews];
  const agree = votes.filter((v) => v.decision === 'agree');
  const disagree = votes.filter((v) => v.decision === 'disagree');
  const expertAgree = agree.filter((v) => v.isExpert).length;
  const expertDisagree = disagree.filter((v) => v.isExpert).length;
  return {
    agree: agree.length,
    disagree: disagree.length,
    expertAgree,
    expertDisagree,
    verified:
      agree.length >= VERIFICATION_RULE.minAgree &&
      expertAgree >= VERIFICATION_RULE.minExpertAgree &&
      expertAgree > expertDisagree &&
      agree.length > disagree.length,
  };
}

/** Request status and verified taxon derived from its proposals. A closed request stays closed. */
export function deriveRequestStatus(
  current: string,
  proposals: ProposalLike[],
): { status: RequestStatus; verifiedTaxonId: number | null } {
  if (current === 'closed') return { status: 'closed', verifiedTaxonId: null };
  if (!proposals.length) return { status: 'open', verifiedTaxonId: null };
  const verified = proposals
    .map((p) => ({ p, t: tallyProposal(p) }))
    .filter((x) => x.t.verified)
    .sort((a, b) => b.t.expertAgree - a.t.expertAgree || b.t.agree - a.t.agree)[0];
  return verified
    ? { status: 'verified', verifiedTaxonId: verified.p.taxonId }
    : { status: 'proposed', verifiedTaxonId: null };
}
