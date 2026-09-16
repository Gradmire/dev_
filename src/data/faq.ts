export type FAQItem = {
  question: string;
  answer: string;
};

export type FAQGroup = {
  category: string;
  items: FAQItem[];
};

export const faqData: FAQGroup[] = [
  {
    category: "General",
    items: [
      {
        question: "Why do you organize by course instead of country?",
        answer:
          "Most study-abroad platforms start with 'pick a country,' but we believe your course should come first. The right programme shapes your career far more than the city you study in. By organizing around subjects, we help you compare options across institutions and find the best academic fit — then figure out the destination, visa, and logistics around it.",
      },
      {
        question: "How much does your service cost?",
        answer:
          "Our initial consultation and course-matching service is completely free. We earn a referral fee from partner universities when you successfully enroll, so there's no cost to you for our guidance, shortlisting, or application support.",
      },
      {
        question: "Do you only work with the UK?",
        answer:
          "Right now we have live course guides for 3 of the 8 UK subjects we're building — Business & Management, Computer Science/AI/Data Science, and Engineering & Technology. We're actively building out the rest of the UK subject list, plus the US, Canada, and Australia — join the waitlist on any of those destination pages to be the first to know when they go live.",
      },
    ],
  },
  {
    category: "Course-Specific",
    items: [
      {
        question: "Do I need work experience for an MBA?",
        answer:
          "Most UK MBA programmes require 2–5 years of professional work experience. However, MSc programmes in business-related fields (MSc Management, MSc Finance, MSc Marketing) typically do not require work experience and are designed for recent graduates or those with limited professional background.",
      },
      {
        question:
          "What's the difference between MSc Computer Science and a conversion course?",
        answer:
          "A standard MSc CS assumes you have an undergraduate degree in computer science or a closely related field. A conversion MSc CS is designed for graduates from non-CS backgrounds (e.g., math, physics, business) who want to transition into tech. Conversion courses typically cover foundational CS topics before advancing to specialized areas. Both are well-regarded by employers.",
      },
      {
        question: "Which courses need ATAS clearance?",
        answer:
          "ATAS (Academic Technology Approval Scheme) is required for certain postgraduate courses in subjects that could relate to weapons of mass destruction or their delivery. This commonly includes aerospace engineering, nuclear physics, certain materials science programmes, and some advanced AI/ML courses. Your university will tell you if ATAS is needed, and we flag it clearly in our course guides. Apply early — it can add 4–6 weeks to your timeline.",
      },
    ],
  },
  {
    category: "Visa",
    items: [
      {
        question: "What is the Graduate Route visa?",
        answer:
          "The Graduate Route is a UK post-study work visa that allows international students to stay and work (or look for work) in the UK for up to 2 years after completing their degree (3 years for PhD graduates). You don't need a job offer to apply, and there are no minimum salary requirements. It's one of the most generous post-study work visas globally.",
      },
      {
        question: "How long does a UK student visa take?",
        answer:
          "A standard UK Student visa (Tier 4) application typically takes 3–4 weeks for a decision after your biometrics appointment. Priority processing (5–7 working days) is available in many countries for an additional fee. We recommend applying as soon as you receive your CAS (Confirmation of Acceptance for Studies) from your university — ideally 2–3 months before your course start date.",
      },
    ],
  },
  {
    category: "Fees",
    items: [
      {
        question: "Are scholarships available?",
        answer:
          "Yes — many UK universities offer merit-based and need-based scholarships for international students. Major schemes include Chevening Scholarships (fully funded, government-backed), Commonwealth Scholarships, and university-specific awards. Amounts range from partial tuition reductions (£2,000–£5,000) to full tuition + living cost coverage. We can help you identify scholarships you're eligible for during the shortlisting process.",
      },
      {
        question:
          "What's the difference between tuition at Russell Group vs. other universities?",
        answer:
          "Russell Group universities (the UK's top 24 research-intensive institutions, similar to the US Ivy League concept) generally charge higher tuition fees — typically £24,000–£45,000+ for postgraduate programmes vs. £15,000–£25,000 at other well-regarded institutions. However, higher fees don't always mean better outcomes for every student. Some non-Russell Group universities have excellent department-level rankings and industry connections in specific fields.",
      },
    ],
  },
];
