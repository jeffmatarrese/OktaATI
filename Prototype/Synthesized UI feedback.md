### **CISO Persona (Marcus O'Brien) UI Feedback**

**What to Keep:**

- **Proportionate Enforcement Controls:** The visibility of the "Restrict Scope" option is highly valued, as it breaks the binary of having to completely terminate an entire session to stop a threat.
    
- **MTTC Metric:** The prominent display of the "Mean Time to Contain" (e.g., 1m 42s) is praised as it visually proves real-time runtime governance and decision velocity.
    
    +1
    

**Actionable UI Updates for the Prototype:**

- **Surface "Shadow AI" Discovery:** The dashboard currently specifies that it monitors "registered AI agents," which leaves a blind spot for undocumented agents. The UI must be updated to explicitly show the auto-discovery of shadow AI to present a complete governance picture.
    
    +2
    
- **Replace "Confidence Scores" with Deterministic Evidence:** Probability percentages (like 88% or 96%) are viewed as guesses and are unacceptable for compliance audits. The alert detail panel must be redesigned to break open the "black box" by displaying an explainable reasoning path. This must include the exact prompt the agent executed, the specific customer data payload, the verified identity, and the hard-coded zero-trust policy that was violated.
    
    +4
    
- **Visualize Multi-Cloud Proof:** The current alerts reference SaaS applications and an AWS environment. The dashboard must visually demonstrate that it covers the entire infrastructure stack, explicitly including GCP and Azure workloads.
    
    +1
    

---

### **SOC Analyst II Persona (Dani) UI Feedback**

**What to Keep:**

- **Alert Priority Ranking:** The current sorting logic matches analyst instincts perfectly, correctly keeping active data exfiltration and privilege escalation in the "Critical" tier, while dropping read-only scope drift to "Medium".
    
- **Tiered Response Options:** The inclusion of "Restrict Scope" and "Stall" mechanisms are essential, allowing the analyst to freeze a specific flagged action while the rest of the workflow continues.
    
    +1
    

**Actionable UI Updates for the Prototype:**

- **Add a 10-Minute Preceding Timeline:** The single most important missing element is context. The alert card must be updated to include the agent's activity timeline for the 10 minutes immediately preceding the alert.
    
    +1
    
- **Integrate Change Management Flags:** Analysts waste time checking ticketing systems manually to see if an action was authorized. The alert card needs a direct flag indicating the status of any active change management tickets or approved maintenance windows.
    
    +2
    
- **Expose the Underlying Signals Behind the Score:** The 96% confidence score progress bar is currently perceived as a black box. The UI must be updated to explicitly show the cross-app correlation and underlying signals (identity, recent activity timeline, and related events) that actually drove the confidence score calculation