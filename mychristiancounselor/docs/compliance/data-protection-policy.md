# Data Protection Policy

**Version:** 1.0
**Effective Date:** January 2026
**Compliance:** HIPAA Privacy Rule, HIPAA Security Rule, GDPR

## Purpose

This Data Protection Policy establishes standards for collecting, using, storing, and protecting Protected Health Information (PHI) and Personal Data in compliance with HIPAA and GDPR regulations.

## Scope

This policy applies to:
- All employees, contractors, and vendors with access to PHI/Personal Data
- All systems, applications, and databases containing PHI/Personal Data
- All physical and electronic records

## Data Classification

### Protected Health Information (PHI)
Information that identifies an individual and relates to:
- Physical or mental health condition
- Provision of health care
- Payment for health care

**Examples:**
- Counseling session notes
- Treatment plans
- Assessment results
- User health information
- Appointment records

### Personal Data (GDPR)
Any information relating to an identified or identifiable natural person.

**Examples:**
- Name, email address, phone number
- IP address, device identifiers
- User preferences and settings
- Payment information

## Data Protection Principles

### 1. Lawfulness, Fairness, Transparency
- Obtain explicit consent before processing PHI/Personal Data
- Provide clear privacy notices
- Process data only for specified, legitimate purposes

### 2. Purpose Limitation
- Collect data only for specified counseling/platform purposes
- Do not use data for incompatible secondary purposes

### 3. Data Minimization
- Collect only data necessary for the stated purpose
- Regularly review and delete unnecessary data

### 4. Accuracy
- Maintain accurate and up-to-date records
- Allow users to correct inaccurate data

### 5. Storage Limitation
- Retain data only as long as necessary
- Implement automated deletion schedules

### 6. Integrity and Confidentiality
- Implement appropriate security measures
- Protect against unauthorized access, loss, or damage

### 7. Accountability
- Demonstrate compliance through documentation
- Conduct regular audits and assessments

## Data Security Measures

### Technical Safeguards

**Encryption:**
- At rest: AES-256-GCM for all databases and file storage
- In transit: TLS 1.2+ for all network communications
- 2FA secrets: AES-256-GCM with per-environment encryption keys

**Access Control:**
- Role-based access control (RBAC)
- Principle of least privilege
- Multi-factor authentication for administrative access
- Automatic session timeout (30 minutes)

**Audit Controls:**
- Comprehensive audit logging
- Log retention: 6 years (HIPAA requirement)
- Regular log review and analysis
- Alerts for suspicious activity

**Integrity Controls:**
- Database transaction logs
- Checksum validation
- Version control for code
- Regular data backups

**Transmission Security:**
- TLS 1.2+ for all API communications
- VPN for remote administrative access
- Secure file transfer protocols

### Administrative Safeguards

**Security Management:**
- Annual risk assessments
- Security incident procedures
- Disaster recovery plan
- Emergency mode operations

**Workforce Training:**
- Annual HIPAA/GDPR training
- Role-specific security training
- Phishing awareness training
- Incident response training

**Access Management:**
- User provisioning/deprovisioning procedures
- Access review (monthly)
- Privileged access management
- Separation of duties

**Vendor Management:**
- Business Associate Agreements required
- Vendor risk assessments
- Regular vendor audits
- Contract termination procedures

### Physical Safeguards

**Facility Access:**
- AWS data centers with physical security
- Badge access systems
- Video surveillance
- Visitor logs

**Workstation Security:**
- Encrypted laptops/devices
- Screen privacy filters
- Automatic screen lock (10 minutes)
- Clean desk policy

**Device Management:**
- Mobile device management (MDM)
- Remote wipe capability
- Lost/stolen device procedures

## Data Retention

### Counseling Records (PHI)
**Retention Period:** 6 years from last session
**Legal Basis:** HIPAA requirement (45 CFR § 164.530)

**Includes:**
- Session notes
- Treatment plans
- Assessment results
- Crisis alerts
- Wellbeing history

### User Account Data
**Retention Period:** 30 days after account deletion
**Legal Basis:** GDPR right to erasure (Article 17)

**Exceptions:**
- Legal hold for litigation
- Regulatory requirements
- Fraud prevention (90 days)

### Audit Logs
**Retention Period:** 6 years
**Legal Basis:** HIPAA requirement (45 CFR § 164.316)

### Marketing Data
**Retention Period:** Until consent withdrawn
**Legal Basis:** GDPR consent (Article 6)

## Data Subject Rights (GDPR)

### Right of Access (Article 15)
Users can request a copy of their personal data.
**Response Time:** Within 30 days

### Right to Rectification (Article 16)
Users can correct inaccurate personal data.
**Response Time:** Within 30 days

### Right to Erasure (Article 17)
Users can request deletion of personal data.
**Response Time:** Within 30 days
**Exceptions:** Legal obligations, public interest

### Right to Restrict Processing (Article 18)
Users can limit how their data is used.
**Response Time:** Within 30 days

### Right to Data Portability (Article 20)
Users can receive their data in a structured format.
**Response Time:** Within 30 days

### Right to Object (Article 21)
Users can object to processing for direct marketing.
**Response Time:** Immediate cessation

## HIPAA Individual Rights

### Right of Access (45 CFR § 164.524)
Individuals can inspect and obtain copies of PHI.
**Response Time:** Within 30 days (extendable to 60 days)
**Fee:** Reasonable cost-based fee permitted

### Right to Amend (45 CFR § 164.526)
Individuals can request amendments to PHI.
**Response Time:** Within 60 days (extendable to 90 days)

### Right to Accounting (45 CFR § 164.528)
Individuals can request list of PHI disclosures.
**Response Time:** Within 60 days (extendable to 90 days)
**Scope:** 6 years of disclosures

### Right to Restrict (45 CFR § 164.522)
Individuals can request restrictions on PHI use/disclosure.
**Note:** Not required to agree, but if agreed must comply

### Right to Confidential Communications (45 CFR § 164.522)
Individuals can request communications via alternative means.

## Breach Response

Refer to **Incident Response Plan** for detailed procedures.

**HIPAA Breach Definition:**
Unauthorized acquisition, access, use, or disclosure of PHI that compromises security or privacy.

**4-Factor Risk Assessment:**
1. Nature and extent of PHI involved
2. Unauthorized person who accessed PHI
3. Whether PHI was actually viewed or acquired
4. Extent to which risk has been mitigated

**Low Risk:** No notification required if documented
**High Risk:** Notification required within 60 days

## Data Processing Agreements

All third-party vendors with access to PHI/Personal Data must sign:
- **Business Associate Agreement (BAA)** for HIPAA
- **Data Processing Agreement (DPA)** for GDPR

**Required Vendors:**
- AWS (cloud infrastructure)
- Postmark (email service)
- Stripe (payment processing)
- Sentry (error monitoring)

## International Data Transfers

**GDPR Requirement:** Adequate protection for data transferred outside EEA.

**Mechanisms:**
- AWS Standard Contractual Clauses (SCCs)
- EU-US Data Privacy Framework (if applicable)

**Data Locations:**
- Primary: US-East-2 (Ohio)
- Backups: US-East-1 (Virginia)

## Privacy by Design

### Development Practices
- Data protection impact assessments (DPIAs) for new features
- Privacy requirements in design specifications
- Security code reviews
- Automated security testing

### Default Settings
- Minimum data collection by default
- Strongest security settings by default
- Opt-in for marketing communications
- Privacy-preserving analytics

## Accountability Measures

### Documentation
- Privacy notices
- Consent records
- Data processing agreements
- Risk assessments
- Audit logs
- Training records

### Audits
- Internal audits (quarterly)
- External audits (annual)
- Vendor audits (annual)

### Reporting
- Quarterly privacy metrics to leadership
- Annual compliance report
- Incident reports as needed

## Sanctions for Non-Compliance

**Internal:**
- Verbal warning
- Written warning
- Suspension
- Termination

**External:**
- Contract termination
- Legal action

## Policy Review

**Review Frequency:** Annual or after significant incidents
**Approval Authority:** Platform Administrator, Legal Counsel

**Triggers for Revision:**
- Changes in regulations
- Significant security incidents
- Technology changes
- Business model changes

---

**Policy Owner:** Platform Administrator
**Approved By:** Legal Counsel
**Next Review Date:** January 2027
