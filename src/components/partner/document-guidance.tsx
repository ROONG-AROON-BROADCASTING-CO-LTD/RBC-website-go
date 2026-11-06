type GuideGroup = {
  id: string;
  title: string;
  items: string[];
};

const applicantGroups: GuideGroup[] = [
  {
    id: "individual",
    title: "Individual owner offering a vehicle for rent",
    items: [
      "Owner identification: a copy of the front of the owner's national ID card or the identity page of their passport.",
      "Use the owner's full name in this form. A company certificate is not needed for an individual application.",
      "Also prepare the documents below for each vehicle you want to offer. Proof of identity alone does not establish the right to rent out a vehicle.",
    ],
  },
  {
    id: "company",
    title: "Company or registered rental business",
    items: [
      "Company registration certificate showing the current company name and authorized signatories. For a registered sole trader, use the commercial registration instead.",
      "Identification of the authorized signatory. If another person submits the application, also include their identification and a signed power of attorney.",
      "Submit this business document set once, then add separate documents for every car, motorcycle, vessel or aircraft offered by the same business.",
    ],
  },
  {
    id: "representative",
    title: "Agent or manager acting for another owner",
    items: [
      "The owner's individual or company documents, together with identification of the person acting for them.",
      "A signed authorization or management agreement identifying the owner, representative, vehicles, rental authority and validity period.",
      "If the vehicle is financed, leased or registered to someone else, include the relevant pages establishing your rights and the rights holder's written consent where the agreement requires it.",
    ],
  },
];

const roadRegistration =
  "Registration book: the pages showing the registration number, vehicle details and registered owner or title holder.";
const roadTax =
  "Current annual vehicle tax evidence and compulsory motor insurance (Por Ror Bor).";
const roadInsurance =
  "Motor insurance policy and written confirmation from the insurer that the intended rental use is covered. Compulsory insurance alone does not confirm rental coverage.";

// Preparation guidance for human review, not an automated legal eligibility check.
// References: OIC motor insurance forms; Marine Department vessel licensing FAQ;
// CAAT AOC certification process and aircraft document requirements.
const vehicleGroups: GuideGroup[] = [
  {
    id: "cars",
    title: "Cars and vans — one set per vehicle",
    items: [
      roadRegistration,
      roadTax,
      roadInsurance,
      "Recent photos of the front, rear, both sides, interior and registration plate, plus the vehicle's seating capacity.",
      "For services with a driver, include the driver's appropriate licence and any permits applicable to that service.",
    ],
  },
  {
    id: "motorcycles",
    title: "Motorcycles — one set per vehicle",
    items: [
      roadRegistration,
      roadTax,
      roadInsurance,
      "Recent photos of both sides, front, rear and registration plate, with model, engine capacity and the helmets or safety equipment supplied.",
      "If offering a passenger service with a rider, provide the rider's appropriate licence and the registration or permits applicable to that service.",
    ],
  },
  {
    id: "boats",
    title: "Boats and yachts — one set per vessel",
    items: [
      "Vessel registration and current vessel-use licence showing the owner, permitted use and passenger capacity.",
      "Current vessel survey or safety certificates applicable to the vessel and proposed service.",
      "Vessel and passenger insurance documents showing the covered service, coverage limits and validity period.",
      "For a crewed service, include the skipper's and relevant crew members' competency certificates appropriate to the vessel and service.",
      "Recent photos showing the vessel name or registration, exterior, passenger areas and safety equipment.",
    ],
  },
  {
    id: "jets",
    title: "Aircraft and private jets — one set per aircraft",
    items: [
      "Aircraft Certificate of Registration and valid Certificate of Airworthiness for the aircraft being offered.",
      "For commercial charter: the operating carrier's Air Operator Certificate (AOC), relevant Operations Specifications and applicable operating licence or authorization, such as CAOL for a Thai operator.",
      "If you are the owner or an agent rather than the operating carrier, include an agreement or authorization linking the aircraft and offered service to the licensed operator.",
      "Current aviation insurance showing passenger and third-party liability coverage for the proposed service.",
      "Aircraft registration mark, model, seating layout and recent exterior and cabin photos. Ownership documents alone are not enough to approve passenger charter services.",
    ],
  },
];

function DocumentGroups({
  groups,
  t,
}: {
  groups: GuideGroup[];
  t: (text: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <details
          key={group.id}
          data-document-guide={group.id}
          className="rounded-xl border px-4 py-3"
        >
          <summary className="cursor-pointer rounded-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {t(group.title)}
          </summary>
          <ul className="mt-3 ml-5 flex list-disc flex-col gap-2 text-muted-foreground">
            {group.items.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export function PartnerDocumentGuidance({
  t,
  categories,
}: {
  t: (text: string) => string;
  categories: readonly string[];
}) {
  return (
    <div
      id="partner-documents-guidance"
      className="flex flex-col gap-5 text-sm leading-relaxed"
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("Documents to prepare")}</h2>
        <p id="partner-documents-help" className="text-muted-foreground">
          {t(
            "One business can offer several vehicle types. Prepare one applicant document set plus a separate set for each vehicle, across every category you offer.",
          )}
        </p>
        <p className="text-muted-foreground">
          {t(
            "Open all sections that apply; you can view several vehicle types at the same time.",
          )}
        </p>
      </div>
      <section
        aria-labelledby="partner-applicant-documents"
        className="flex flex-col gap-3"
      >
        <h3 id="partner-applicant-documents" className="font-semibold">
          {t("1. Applicant documents — once per person or business")}
        </h3>
        <DocumentGroups groups={applicantGroups} t={t} />
      </section>
      <section
        aria-labelledby="partner-vehicle-documents"
        className="flex flex-col gap-3"
      >
        <h3 id="partner-vehicle-documents" className="font-semibold">
          {t("2. Vehicle documents — every category, every vehicle")}
        </h3>
        {categories.length ? (
          <DocumentGroups
            groups={vehicleGroups.filter((group) =>
              categories.includes(group.id),
            )}
            t={t}
          />
        ) : (
          <p className="text-muted-foreground">
            {t(
              "Select rental categories above to see the documents for each vehicle type.",
            )}
          </p>
        )}
      </section>
      <p className="text-muted-foreground">
        {t(
          "For every category: if the applicant is not the registered owner, or the vehicle is financed or leased, attach evidence of the right to offer it for rent and any consent required by the agreement.",
        )}
      </p>
      <p className="text-muted-foreground">
        {t(
          "For example, a company offering 2 cars and 1 boat submits 1 company document set, 2 car document sets and 1 boat document set.",
        )}
      </p>
      <p className="text-muted-foreground">
        {t(
          "Group related pages into a PDF for each vehicle. Name files with the category and registration number, and keep names, numbers and expiry dates readable.",
        )}
      </p>
      <p className="text-muted-foreground">
        {t(
          "Mark identity copies 'For RBC GO partner verification only' with the date. Hide unrelated sensitive details, such as religion and the code on the back of an ID card. Do not upload bank statements at this stage.",
        )}
      </p>
      <p className="text-muted-foreground">
        {t(
          "These documents are for review. Our team may request additional evidence for the actual service; submission does not mean the applicant or every vehicle is approved.",
        )}
      </p>
    </div>
  );
}
