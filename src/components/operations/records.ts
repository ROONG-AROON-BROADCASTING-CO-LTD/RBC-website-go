import { vehicleById, type AppState } from "@/lib/domain";

export type Row = {
  id: string;
  name: string;
  detail: string;
  status: string;
  amount?: number;
};
export function records(state: AppState, tab: string): Row[] {
  const p = state.partner;
  switch (tab) {
    case "partners":
      return p.status === "Not submitted"
        ? []
        : [
            {
              id: "PARTNER-001",
              name: p.business,
              detail: p.email,
              status: p.status,
            },
          ];
    case "listings":
      return p.listing
        ? [
            {
              id: "LISTING-001",
              name: p.listing.name,
              detail: p.listing.location,
              status: p.listing.status,
              amount: p.listing.price,
            },
          ]
        : [];
    case "requests":
      return state.quote
        ? [
            {
              id: state.quote.id,
              name: vehicleById(state.quote.vehicleId)!.name,
              detail: state.quote.traveler.name,
              status:
                state.bookings.find(
                  (booking) => booking.quoteId === state.quote?.id,
                )?.status ?? state.quote.status,
            },
          ]
        : [];
    case "bookings":
      return state.bookings.map((b) => ({
        id: b.id,
        name: vehicleById(b.vehicleId)!.name,
        detail: b.traveler.name,
        status: b.status,
        amount: b.total,
      }));
    case "payments":
      return state.bookings.map((b) => ({
        id: b.id,
        name: vehicleById(b.vehicleId)!.name,
        detail: b.traveler.name,
        status: b.payment,
        amount: b.total,
      }));
    case "fleet":
      return [
        {
          id: "FLEET-001",
          name: "Mercedes-Benz E-Class",
          detail: "RBC GO · Company-owned · Sample",
          status: state.fleet,
          amount: 3200,
        },
      ];
    default:
      return [];
  }
}
