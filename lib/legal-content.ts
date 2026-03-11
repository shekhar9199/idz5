export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalPage {
  key: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const COMPANY = "[Your Company Name]";
const ADDRESS = "[Your Business Address]";
const EMAIL = "[your-email@example.com]";
const GST = "[Your GST Number, if applicable]";
const APP_NAME = "iDigitalZone";

export const legalPages: Record<string, LegalPage> = {
  privacy: {
    key: "privacy",
    title: "Privacy Policy",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. Introduction",
        content: `This Privacy Policy explains how ${COMPANY}, operating the mobile application "${APP_NAME}" ("App", "we", "us", "our"), collects, uses, stores, shares, and protects the personal information of its users ("you", "your", "User"). By accessing or using our App, you consent to the practices described herein.\n\nThis policy is published in compliance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and other applicable laws of India.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}\nGST Number: ${GST}`,
      },
      {
        title: "2. Information We Collect",
        content: `We collect the following categories of information:\n\na) Personal Information Provided by You:\n- Full name, email address, and phone number during registration.\n- UPI ID when you initiate a withdrawal request.\n- Referral codes used or shared by you.\n\nb) Transaction & Financial Data:\n- Purchase history, wallet balance, coin balance, and transaction records.\n- Withdrawal request details including amount, tax deduction, and UPI information.\n- Payment information processed through secure third-party payment gateways (e.g., Stripe).\n\nc) Device & Technical Data:\n- Device type, operating system, unique device identifiers.\n- Push notification tokens for delivering notifications.\n- IP address, browser type, and usage analytics.\n\nd) Usage Data:\n- Pages visited, features used, time spent on the App.\n- Chat and support interactions for service improvement.`,
      },
      {
        title: "3. Purpose of Data Collection",
        content: `We use the collected information for the following purposes:\n- To create and manage your account and authenticate your identity.\n- To process purchases, subscriptions, and service bookings.\n- To manage your wallet balance (rupees and coins), process withdrawals, and apply applicable taxes.\n- To administer the referral and reward programme.\n- To send push notifications regarding order updates, chat messages, and promotional offers.\n- To provide customer support and resolve disputes.\n- To detect, prevent, and address fraud, abuse, and security incidents.\n- To comply with applicable laws, regulations, and legal obligations.`,
      },
      {
        title: "4. Data Storage & Security",
        content: `Your data is stored securely using Firebase (Google Cloud Platform) with industry-standard encryption and access controls. We implement reasonable security practices as required under Indian law, including:\n- Encrypted data transmission using TLS/SSL.\n- Secure authentication using Firebase Authentication.\n- Access controls limiting data access to authorised personnel only.\n- Regular security audits and monitoring.\n\nWhile we take all reasonable measures to protect your data, no system is entirely secure. We cannot guarantee absolute security of your information transmitted over the internet.`,
      },
      {
        title: "5. Data Sharing & Disclosure",
        content: `We do not sell, rent, or trade your personal information to third parties. We may share your data in the following circumstances:\n- With payment processors (e.g., Stripe) to facilitate transactions.\n- With cloud infrastructure providers (e.g., Google/Firebase) for data storage and processing.\n- When required by law, regulation, legal process, or governmental request.\n- To enforce our Terms & Conditions or protect the rights, property, or safety of ${COMPANY}, our users, or the public.\n- In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of the business transaction.`,
      },
      {
        title: "6. Data Retention",
        content: `We retain your personal information for as long as your account is active or as necessary to provide services to you. Upon account deletion, we will delete your personal data within a reasonable period, except where retention is required for legal, regulatory, or legitimate business purposes such as fraud prevention and dispute resolution.`,
      },
      {
        title: "7. Your Rights",
        content: `Subject to applicable Indian law, you have the right to:\n- Access the personal information we hold about you.\n- Request correction of inaccurate or incomplete personal data.\n- Request deletion of your account and associated data.\n- Withdraw consent for data processing (which may limit your ability to use certain features).\n- Lodge a complaint with the relevant data protection authority.\n\nTo exercise any of these rights, please contact us at ${EMAIL}.`,
      },
      {
        title: "8. Cookies & Tracking",
        content: `The App may use cookies, local storage, and similar tracking technologies to enhance user experience and analyse usage patterns. You may manage your preferences through your device settings. Disabling certain tracking features may affect the functionality of the App.`,
      },
      {
        title: "9. Third-Party Links",
        content: `Our App may contain links to third-party websites or services. We are not responsible for the privacy practices, content, or security of such third-party platforms. We encourage you to review their privacy policies independently.`,
      },
      {
        title: "10. Children's Privacy",
        content: `Our App is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided personal data, we will take steps to delete such information promptly.`,
      },
      {
        title: "11. Changes to This Policy",
        content: `We reserve the right to modify this Privacy Policy at any time. Any changes will be communicated through the App or via email notification. Continued use of the App after such changes constitutes your acceptance of the revised policy. We recommend reviewing this policy periodically.`,
      },
      {
        title: "12. Grievance Officer",
        content: `In accordance with the Information Technology Act, 2000 and the rules made thereunder, the contact details of the Grievance Officer are as follows:\n\nName: ${COMPANY}\nAddress: ${ADDRESS}\nEmail: ${EMAIL}\n\nThe Grievance Officer shall address your concerns within 30 days of receipt of a written complaint.`,
      },
      {
        title: "13. Governing Law",
        content: `This Privacy Policy shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with this policy shall be subject to the exclusive jurisdiction of the courts in India.`,
      },
    ],
  },

  terms: {
    key: "terms",
    title: "Terms & Conditions",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content: `These Terms & Conditions ("Terms") govern your use of the ${APP_NAME} mobile application ("App") operated by ${COMPANY} ("Company", "we", "us", "our"). By downloading, installing, or using the App, you agree to be bound by these Terms. If you do not agree, you must discontinue use of the App immediately.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}\nGST Number: ${GST}`,
      },
      {
        title: "2. Eligibility",
        content: `You must be at least 18 years of age and a resident of India to use this App. By using the App, you represent and warrant that you meet these eligibility requirements and have the legal capacity to enter into a binding agreement.`,
      },
      {
        title: "3. Account Registration",
        content: `To access certain features, you must create an account by providing accurate, current, and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. You must notify us immediately of any unauthorised use of your account.\n\nWe reserve the right to suspend or terminate accounts that contain false or misleading information, or that are used in violation of these Terms.`,
      },
      {
        title: "4. Services Offered",
        content: `The App provides the following services:\n- Digital marketing services (Meta Ads management and related services).\n- Premium OTT application subscriptions.\n- In-app wallet system with rupee balance and coin rewards.\n- Referral and reward programme.\n- Withdrawal facility for wallet balance via UPI.\n- Customer support via in-app chat and WhatsApp.\n\nAll services are subject to availability and may be modified, suspended, or discontinued at our sole discretion.`,
      },
      {
        title: "5. Wallet System",
        content: `The App features a dual-currency wallet system:\n\na) Rupee Balance: Funds added by the user or credited through coin redemption. This balance is used for purchasing services and subscriptions within the App.\n\nb) Coins: Earned through the referral programme. Coins can be redeemed at the rate of 100 coins = \u20B910. Coins have no cash value outside the App and cannot be directly withdrawn.\n\nThe Company reserves the right to modify coin conversion rates, reward amounts, and wallet policies at any time with prior notice.`,
      },
      {
        title: "6. Purchases & Payments",
        content: `All purchases within the App are made using the wallet rupee balance. Payment processing for adding funds to the wallet is handled by Stripe, a PCI-DSS compliant third-party payment gateway. Prices for services are displayed in Indian Rupees (\u20B9) and are inclusive of applicable taxes unless stated otherwise.\n\nBy making a purchase, you agree that the transaction is final, subject to the Refund & Cancellation Policy.`,
      },
      {
        title: "7. Withdrawals",
        content: `Users may withdraw their wallet rupee balance subject to the following conditions:\n- Minimum withdrawal amount: \u20B9200.\n- Only one pending withdrawal request is permitted at a time.\n- All withdrawals are subject to tax deduction as applicable (currently 18%, subject to change per government regulations).\n- Withdrawals require administrative approval.\n- Approved withdrawals are processed to the UPI ID provided by the user.\n- Failed or rejected withdrawals are refunded to the user's wallet balance.\n\nThe Company is not responsible for delays caused by banking systems, incorrect UPI details, or regulatory compliance requirements. Please refer to our Withdrawal Policy for complete details.`,
      },
      {
        title: "8. Prohibited Conduct",
        content: `You agree not to:\n- Use the App for any unlawful, fraudulent, or malicious purpose.\n- Create multiple accounts to exploit the referral system or promotional offers.\n- Provide false or misleading information during registration or transactions.\n- Attempt to manipulate wallet balances, coin rewards, or referral systems.\n- Use automated scripts, bots, or other means to interact with the App.\n- Reverse-engineer, decompile, or attempt to extract the source code of the App.\n- Harass, abuse, or threaten other users or Company personnel through the chat system.\n- Circumvent or attempt to circumvent any security measures implemented in the App.\n\nViolation of these terms may result in immediate account suspension or permanent termination, forfeiture of wallet balance and coins, and legal action as deemed appropriate.`,
      },
      {
        title: "9. Intellectual Property",
        content: `All content, design, graphics, logos, trademarks, and software associated with the App are the exclusive property of ${COMPANY} and are protected under applicable intellectual property laws of India. You are granted a limited, non-exclusive, non-transferable, revocable licence to use the App for personal, non-commercial purposes. Any unauthorised reproduction, distribution, or modification of the App's content is strictly prohibited.`,
      },
      {
        title: "10. Limitation of Liability",
        content: `To the maximum extent permitted by law:\n- The App and its services are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.\n- ${COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.\n- Our total liability for any claim arising out of these Terms shall not exceed the amount paid by you to the Company in the 12 months preceding the claim.\n- We are not liable for losses arising from third-party payment gateway failures, network issues, or force majeure events.`,
      },
      {
        title: "11. Indemnification",
        content: `You agree to indemnify, defend, and hold harmless ${COMPANY}, its directors, officers, employees, and agents from any claims, losses, damages, liabilities, and expenses (including legal fees) arising from your use of the App, violation of these Terms, or infringement of any third-party rights.`,
      },
      {
        title: "12. Account Suspension & Termination",
        content: `We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason including but not limited to:\n- Violation of these Terms & Conditions.\n- Fraudulent or suspicious activity.\n- Abuse of the referral or wallet system.\n- Non-compliance with applicable laws.\n\nUpon termination, your right to use the App ceases immediately. Any pending withdrawals may be cancelled, and wallet balances may be forfeited in cases of fraud or policy violation.`,
      },
      {
        title: "13. Modifications to Terms",
        content: `We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Continued use of the App after modifications constitutes acceptance of the revised Terms. We recommend reviewing these Terms periodically.`,
      },
      {
        title: "14. Governing Law & Dispute Resolution",
        content: `These Terms shall be governed by the laws of India. Any dispute arising out of or in connection with these Terms shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts in India.`,
      },
      {
        title: "15. Contact Information",
        content: `For any questions or concerns regarding these Terms, please contact:\n\n${COMPANY}\nAddress: ${ADDRESS}\nEmail: ${EMAIL}`,
      },
    ],
  },

  refund: {
    key: "refund",
    title: "Refund & Cancellation Policy",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. Overview",
        content: `This Refund & Cancellation Policy ("Policy") outlines the terms governing refunds, cancellations, and returns for all transactions made through the ${APP_NAME} mobile application ("App") operated by ${COMPANY}.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}`,
      },
      {
        title: "2. Wallet Top-Up Refunds",
        content: `Funds added to the in-app wallet via payment gateway are generally non-refundable once credited to the wallet balance. However, refunds for wallet top-ups may be considered in the following circumstances:\n- Duplicate transactions caused by payment gateway errors.\n- Unauthorised transactions reported within 48 hours.\n- Funds credited but not reflected in the wallet balance due to technical errors.\n\nRefund requests for wallet top-ups must be submitted within 7 days of the transaction by contacting us at ${EMAIL}. Approved refunds will be processed to the original payment method within 7-10 business days.`,
      },
      {
        title: "3. Service Purchase Cancellation",
        content: `a) Meta Ads Services:\n- Cancellation requests must be submitted before work on the service has commenced.\n- Once the service delivery has begun, cancellations are not permitted and no refund shall be issued.\n- Partial refunds may be considered on a case-by-case basis if the service is substantially incomplete.\n\nb) OTT/Premium App Subscriptions:\n- Subscription requests, once confirmed and processed, are non-refundable.\n- If a subscription service is unavailable or cannot be fulfilled, a full refund will be issued to the wallet balance.\n\nAll cancellation requests must be communicated through the in-app chat or by emailing ${EMAIL}.`,
      },
      {
        title: "4. Withdrawal Refunds",
        content: `If a withdrawal request is rejected or fails during processing:\n- The full withdrawal amount (before tax deduction) is automatically refunded to the user's wallet balance.\n- Tax deductions are reversed in the case of failed withdrawals.\n- Refunds for failed withdrawals are processed immediately and reflected in the wallet.\n\nThe Company is not responsible for delays caused by external banking systems or UPI network issues.`,
      },
      {
        title: "5. Non-Refundable Items",
        content: `The following are non-refundable under any circumstances:\n- Coins earned through the referral programme.\n- Wallet balance consumed for completed service purchases.\n- Services that have been fully delivered.\n- Administrative fees or charges, if any.`,
      },
      {
        title: "6. Fraudulent Transactions",
        content: `If we determine that a refund request is fraudulent, involves misuse of the system, or violates our Terms & Conditions, we reserve the right to deny the refund and take appropriate action, including account suspension or termination.`,
      },
      {
        title: "7. How to Request a Refund",
        content: `To request a refund or cancellation:\n1. Open the App and navigate to the in-app chat support.\n2. Provide your transaction details, order ID, and reason for the request.\n3. Alternatively, email us at ${EMAIL} with the subject line "Refund Request - [Your Order ID]".\n\nAll refund requests are reviewed within 3-5 business days. You will be notified of the outcome via the App or email.`,
      },
      {
        title: "8. Modifications to This Policy",
        content: `We reserve the right to modify this Refund & Cancellation Policy at any time. Changes will be effective upon posting within the App. Continued use of the App constitutes acceptance of the revised policy.`,
      },
    ],
  },

  withdrawal: {
    key: "withdrawal",
    title: "Withdrawal Policy",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. Overview",
        content: `This Withdrawal Policy governs the withdrawal of funds from the wallet balance of the ${APP_NAME} mobile application ("App") operated by ${COMPANY}. Please read this policy carefully before initiating a withdrawal request.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}\nGST Number: ${GST}`,
      },
      {
        title: "2. Eligibility for Withdrawal",
        content: `To be eligible for withdrawal, you must:\n- Have a registered and verified account on the App.\n- Maintain a minimum wallet balance of \u20B9200.\n- Provide a valid UPI ID linked to a bank account in your name.\n- Not have any pending withdrawal requests at the time of submission.\n- Have an account in good standing with no pending investigations or policy violations.`,
      },
      {
        title: "3. Withdrawal Process",
        content: `a) Initiating a Request:\n- Navigate to the Wallet section and tap "Withdraw Money".\n- Enter the withdrawal amount (\u20B9200 minimum).\n- Provide your UPI ID for fund transfer.\n- Review the tax breakdown and final amount.\n- Confirm the withdrawal request.\n\nb) Wallet Deduction:\n- The full withdrawal amount is immediately deducted from your wallet balance upon submission.\n- This ensures that the balance cannot be used for other transactions while the withdrawal is being processed.\n\nc) Admin Approval:\n- All withdrawal requests are subject to administrative review and approval.\n- The admin team verifies the request for compliance, fraud checks, and validity.\n- You will be notified of the approval or rejection status.`,
      },
      {
        title: "4. Tax Deduction",
        content: `A tax is deducted from the withdrawal amount before disbursement:\n- The current tax rate is 18% (inclusive of GST and applicable charges).\n- The tax percentage is configurable and may change based on government regulations, tax law amendments, or Company policy updates.\n- The tax breakdown (gross amount, tax amount, and net receivable amount) is displayed before you confirm the withdrawal.\n- You are advised to review the tax details carefully before confirming.\n\nExample: For a withdrawal of \u20B91,000 at 18% tax:\n- Tax Deducted: \u20B9180\n- Amount Received: \u20B9820\n\n${COMPANY} may issue appropriate tax documentation as required by Indian tax laws.`,
      },
      {
        title: "5. Approval & Processing",
        content: `Withdrawal requests have the following statuses:\n\na) Pending: The request has been submitted and is awaiting admin review.\nb) Approved: The request has been approved. Funds will be transferred to your UPI ID.\nc) Failed/Rejected: The request has been rejected due to compliance, fraud, or other reasons.\n\nProcessing Timeline:\n- Admin review: Typically within 1-3 business days.\n- Fund transfer after approval: 1-5 business days depending on banking systems.\n- The Company is not liable for delays caused by banking infrastructure or UPI network issues.`,
      },
      {
        title: "6. Failed Withdrawals & Refunds",
        content: `If a withdrawal request is rejected or fails:\n- The full withdrawal amount (before tax deduction) is automatically refunded to your wallet balance.\n- A "Withdrawal Refund" transaction will appear in your wallet history.\n- No tax is charged on failed withdrawals.\n- Common reasons for rejection include: suspicious activity, incorrect UPI details, compliance issues, or policy violations.`,
      },
      {
        title: "7. Restrictions & Limitations",
        content: `- Only one pending withdrawal request is permitted at a time.\n- The minimum withdrawal amount is \u20B9200.\n- Wallet coins cannot be directly withdrawn. Coins must first be redeemed to rupee balance (100 coins = \u20B910) before withdrawal.\n- The Company reserves the right to impose withdrawal limits, additional verification requirements, or temporary restrictions at its discretion.\n- Withdrawals are not permitted from accounts under investigation for fraud or policy violations.`,
      },
      {
        title: "8. Fraud Prevention",
        content: `To maintain the integrity of the withdrawal system, we implement the following measures:\n- Verification of withdrawal requests against account activity.\n- Monitoring for unusual patterns such as rapid deposits followed by immediate withdrawals.\n- Cross-referencing UPI IDs with account holder information.\n- The Company reserves the right to delay, deny, or reverse withdrawals if fraudulent activity is suspected.\n\nAccounts found engaging in fraudulent withdrawal activities will be permanently suspended, and legal action may be pursued under applicable Indian law.`,
      },
      {
        title: "9. Changes to Withdrawal Policy",
        content: `We reserve the right to modify this Withdrawal Policy, including tax rates, minimum amounts, and processing procedures, at any time. Changes will be communicated through the App. Continued use of the withdrawal facility after changes constitutes acceptance of the revised policy.`,
      },
      {
        title: "10. Contact",
        content: `For queries related to withdrawals, please contact:\n\n${COMPANY}\nEmail: ${EMAIL}\nAddress: ${ADDRESS}`,
      },
    ],
  },

  referral: {
    key: "referral",
    title: "Referral & Reward Policy",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. Overview",
        content: `This Referral & Reward Policy ("Policy") governs the referral programme and coin reward system offered by ${COMPANY} through the ${APP_NAME} mobile application ("App"). By participating in the referral programme, you agree to the terms outlined herein.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}`,
      },
      {
        title: "2. How the Referral Programme Works",
        content: `a) Referral Code:\n- Each registered user is assigned a unique referral code upon account creation.\n- You can share your referral code with friends and family via the "Invite & Earn" section of the App.\n\nb) Applying a Referral Code:\n- New users can enter a referral code during the sign-up process.\n- A referral code can only be applied once, at the time of registration.\n- Self-referrals (using your own referral code) are prohibited and will not be rewarded.\n\nc) Earning Rewards:\n- The referrer earns coin rewards only after the referred user successfully makes their first purchase on the App.\n- Simply signing up with a referral code does not qualify for a reward.\n- This ensures that rewards are earned through genuine user activity and engagement.`,
      },
      {
        title: "3. Coin Rewards",
        content: `a) Reward Amount:\n- The default referral reward is 500 coins per successful referral.\n- The reward amount is configurable by the Company and may change at any time.\n\nb) Coin Value:\n- Coins are a virtual, non-monetary reward within the App.\n- Coins can be redeemed at the rate of 100 coins = \u20B910 (credited to wallet rupee balance).\n- Coins have no cash value outside the App and cannot be transferred to other users.\n- Coins cannot be directly withdrawn. They must first be redeemed to rupee balance.\n\nc) Coin Crediting:\n- Coins are automatically credited to the referrer's wallet after the referred user completes their first purchase.\n- A notification is sent to the referrer confirming the reward.`,
      },
      {
        title: "4. Fraud Prevention & Fair Use",
        content: `The Company takes fraud prevention seriously. The following activities are strictly prohibited:\n- Creating multiple accounts to generate fake referrals.\n- Using bots, scripts, or automated tools to distribute referral codes.\n- Colluding with others to generate fraudulent referral rewards.\n- Providing incentives to users solely for the purpose of signing up without genuine intent to use the App.\n- Exploiting bugs or vulnerabilities in the referral system.\n\nConsequences of Violation:\n- Immediate forfeiture of all earned coins and wallet balance.\n- Account suspension or permanent termination.\n- Recovery of any funds or benefits obtained through fraudulent means.\n- Legal action under applicable Indian law, including but not limited to the Information Technology Act, 2000 and the Indian Penal Code.`,
      },
      {
        title: "5. Idempotency & Duplicate Prevention",
        content: `The referral system implements the following safeguards:\n- Each referred user can only trigger one reward for the referrer.\n- Duplicate rewards for the same referred user are automatically prevented.\n- Rewards are tracked through a dedicated system to ensure accuracy and prevent double-crediting.`,
      },
      {
        title: "6. Clarification: No Gambling or Betting",
        content: `The referral and reward programme is not a lottery, gambling, betting, or game of chance. Rewards are earned through legitimate referral activity and purchase transactions. There is no element of luck, random selection, or chance involved in earning rewards. This programme fully complies with Indian laws governing promotional schemes.`,
      },
      {
        title: "7. Programme Modification & Termination",
        content: `The Company reserves the right to:\n- Modify the referral reward amount, coin conversion rates, or programme rules at any time.\n- Suspend or terminate the referral programme temporarily or permanently.\n- Revoke rewards that were earned through violations of this Policy.\n\nAny changes will be communicated through the App. Continued participation after changes constitutes acceptance of the revised terms.`,
      },
      {
        title: "8. Tax Implications",
        content: `Referral rewards (coins) are virtual credits with no direct monetary value until redeemed. Once redeemed and withdrawn, the withdrawn amount is subject to applicable taxes as outlined in our Withdrawal Policy. Users are solely responsible for reporting any income earned through the referral programme as required by Indian tax laws.`,
      },
      {
        title: "9. Contact",
        content: `For questions regarding the referral programme, please contact:\n\n${COMPANY}\nEmail: ${EMAIL}\nAddress: ${ADDRESS}`,
      },
    ],
  },

  disclaimer: {
    key: "disclaimer",
    title: "Disclaimer",
    lastUpdated: "14 February 2026",
    sections: [
      {
        title: "1. General Disclaimer",
        content: `The information and services provided through the ${APP_NAME} mobile application ("App") by ${COMPANY} are offered on an "as is" and "as available" basis. While we strive to ensure accuracy and reliability, we make no representations or warranties of any kind, express or implied, regarding the completeness, accuracy, reliability, suitability, or availability of the App or the services offered.\n\nRegistered Address: ${ADDRESS}\nContact Email: ${EMAIL}`,
      },
      {
        title: "2. Service Disclaimer",
        content: `a) Meta Ads Services:\n- Results from digital marketing campaigns (including Meta/Facebook Ads) depend on multiple factors outside our control, including market conditions, ad policies, audience behaviour, and platform algorithms.\n- We do not guarantee specific outcomes, returns on investment, or performance metrics for any marketing service.\n\nb) OTT/Premium App Subscriptions:\n- Subscription services are provided through third-party platforms. Availability, pricing, and features are subject to the policies of the respective platform providers.\n- ${COMPANY} acts as a facilitator and is not the direct provider of OTT content.`,
      },
      {
        title: "3. Financial Disclaimer",
        content: `- The wallet system, coin rewards, and withdrawal facility are proprietary features of the App and are not regulated financial products.\n- Coins are virtual credits with no intrinsic monetary value and do not constitute currency, securities, or financial instruments.\n- Wallet balances do not earn interest and are not insured by any government agency.\n- Tax deductions on withdrawals are applied as per prevailing rates and government regulations. The tax percentage may change without prior notice based on changes in Indian tax laws.\n- ${COMPANY} is not a banking institution, payment bank, or non-banking financial company (NBFC). The wallet feature is solely for facilitating transactions within the App.`,
      },
      {
        title: "4. No Gambling or Betting",
        content: `${APP_NAME} does not offer or facilitate any form of gambling, betting, lottery, lucky draw, or game of chance. The referral reward system is purely performance-based, rewarding users for genuine referrals that result in purchases. No element of luck or random chance is involved in earning rewards.`,
      },
      {
        title: "5. Third-Party Disclaimer",
        content: `The App may integrate with or link to third-party services, including but not limited to:\n- Stripe (payment processing)\n- Firebase/Google Cloud (data storage and authentication)\n- UPI payment networks (withdrawal processing)\n\nWe are not responsible for the availability, accuracy, or security of third-party services. Your use of third-party services is governed by their respective terms and privacy policies. Any disputes with third-party providers must be resolved directly with them.`,
      },
      {
        title: "6. Accuracy of Information",
        content: `We endeavour to keep all information on the App accurate and up to date. However, we do not warrant that:\n- All information is free from errors or omissions.\n- The App will be uninterrupted, timely, or free from technical issues.\n- Defects will be corrected within a specified timeframe.\n\nAny reliance you place on information provided through the App is at your own risk.`,
      },
      {
        title: "7. Limitation of Liability",
        content: `To the fullest extent permitted by applicable law, ${COMPANY}, its directors, officers, employees, affiliates, and agents shall not be liable for:\n- Any direct, indirect, incidental, special, consequential, or punitive damages.\n- Loss of profits, revenue, data, or business opportunities.\n- Damages arising from unauthorised access to your account or data.\n- Damages resulting from interruption, delay, or failure of the App.\n- Damages arising from the conduct of any third party on or through the App.\n\nIn no event shall our total aggregate liability exceed the amount paid by you to the Company in the 12 months preceding the claim.`,
      },
      {
        title: "8. Force Majeure",
        content: `${COMPANY} shall not be held liable for any failure or delay in performing obligations under this agreement due to circumstances beyond our reasonable control, including but not limited to natural disasters, pandemics, government actions, regulatory changes, internet or telecommunications failures, cyber attacks, power outages, or civil unrest.`,
      },
      {
        title: "9. Account Suspension",
        content: `${COMPANY} reserves the right to suspend or terminate user accounts for misuse, fraud, policy violations, or any activity deemed harmful to the platform or its users. In such cases:\n- Pending withdrawals may be cancelled.\n- Wallet balances and coins may be forfeited.\n- The Company is not obligated to provide compensation for suspended or terminated accounts involved in policy violations.`,
      },
      {
        title: "10. Regulatory Compliance",
        content: `${COMPANY} operates in compliance with applicable Indian laws and regulations, including:\n- Information Technology Act, 2000\n- Consumer Protection Act, 2019\n- Goods and Services Tax Act, 2017\n- Foreign Exchange Management Act, 1999 (where applicable)\n\nWe reserve the right to modify our policies and practices to ensure continued compliance with evolving regulations.`,
      },
      {
        title: "11. Changes to This Disclaimer",
        content: `This Disclaimer may be updated from time to time. The latest version will always be available within the App. Continued use of the App after any modifications constitutes your acceptance of the revised Disclaimer.`,
      },
      {
        title: "12. Contact Information",
        content: `For any questions or concerns regarding this Disclaimer, please contact:\n\n${COMPANY}\nAddress: ${ADDRESS}\nEmail: ${EMAIL}`,
      },
    ],
  },
};

export const legalPageOrder = ["privacy", "terms", "refund", "withdrawal", "referral", "disclaimer"] as const;

export function getLegalPage(key: string): LegalPage | undefined {
  return legalPages[key];
}
