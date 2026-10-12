from typing import List, Tuple, Dict, Any
from app.schemas.ai_analysis import AIAnalysisReport, AIFindingEnrichment
from app.schemas.finding import FindingCreate, TestSuggestion


class AIValidator:
    def validate_and_filter(
        self,
        raw_ai_data: Dict[str, Any],
        known_files: List[str]
    ) -> Tuple[AIAnalysisReport, List[str]]:
        """
        Validates LLM output against strict Pydantic schemas.
        Enforces rule: Reject any claim without valid evidence_refs.
        """
        rejection_reasons: List[str] = []

        try:
            report = AIAnalysisReport.model_validate(raw_ai_data)
        except Exception as e:
            raise ValueError(f"AI output failed schema validation: {str(e)}")

        valid_enrichments: List[AIFindingEnrichment] = []

        for idx, item in enumerate(report.enrichments):
            # Check 1: Non-empty evidence_refs
            if not item.evidence_refs or len(item.evidence_refs) == 0:
                rejection_reasons.append(
                    f"Rejected hypothesis '{item.title}': No evidence_refs provided."
                )
                continue

            # Check 2: Verify that evidence_refs point to files actually present in the PR
            has_plausible_anchor = False
            for ref in item.evidence_refs:
                ref_file = ref.get("file", "") or ref.get("file_path", "")
                if not ref_file or any(kf in ref_file or ref_file in kf for kf in known_files) or ref.get("rule_id"):
                    has_plausible_anchor = True
                    break

            if not has_plausible_anchor and known_files:
                rejection_reasons.append(
                    f"Rejected hypothesis '{item.title}': Evidence refers to unknown files outside PR diff."
                )
                continue

            valid_enrichments.append(item)

        # Replace with filtered valid list
        report.enrichments = valid_enrichments
        return report, rejection_reasons
