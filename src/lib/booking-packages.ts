import type { Category } from "./domain";

export type BookingPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
};

const packages: Record<Category, BookingPackage[]> = {
  cars: [
    {
      id: "additional-driver",
      name: "Additional driver",
      description: "Share the driving with a registered second driver.",
      price: 500,
    },
    {
      id: "child-seat",
      name: "Child seat",
      description: "A child seat prepared before your pickup.",
      price: 300,
    },
    {
      id: "pickup-assistance",
      name: "Pickup assistance",
      description: "Meet-and-greet support at your pickup point.",
      price: 700,
    },
  ],
  motorcycles: [
    {
      id: "premium-helmet",
      name: "Premium helmet",
      description: "Upgrade your helmet for a more comfortable ride.",
      price: 200,
    },
    {
      id: "phone-holder",
      name: "Phone holder",
      description: "Keep your navigation in view while riding.",
      price: 100,
    },
    {
      id: "hotel-delivery",
      name: "Hotel delivery",
      description: "Have your motorcycle delivered to your hotel.",
      price: 350,
    },
  ],
  boats: [
    {
      id: "water-sports",
      name: "Water sports package",
      description: "Extra water activities for your day at sea.",
      price: 900,
    },
    {
      id: "refreshments",
      name: "Refreshment package",
      description: "A selection of snacks and drinks for your group.",
      price: 1500,
    },
    {
      id: "celebration",
      name: "Celebration setup",
      description: "Make your special occasion a little more memorable.",
      price: 2500,
    },
  ],
  jets: [
    {
      id: "lounge",
      name: "Lounge access",
      description: "Relax in the lounge before your departure.",
      price: 2500,
    },
    {
      id: "catering",
      name: "Premium catering",
      description: "A curated dining selection for your flight.",
      price: 4500,
    },
    {
      id: "ground-transfer",
      name: "Ground transfer",
      description: "A private transfer between the terminal and your hotel.",
      price: 2000,
    },
  ],
};

export const bookingPackages = (category: Category) => packages[category];
export const selectedPackages = (category: Category, ids: string[] = []) =>
  packages[category].filter((item) => ids.includes(item.id));

export function testCardErrors(
  card: { name: string; number: string; expiry: string; cvc: string },
  now = new Date(),
) {
  const number = card.number.replace(/\s/g, "");
  const match = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(card.expiry);
  const expires = match
    ? new Date(2000 + Number(match[2]), Number(match[1]), 1)
    : null;
  return {
    name: card.name.trim() ? "" : "Enter the cardholder name.",
    number: ["4242424242424242", "4000000000000002"].includes(number)
      ? ""
      : "Use a test card number shown below.",
    expiry:
      expires && expires > now
        ? ""
        : "Enter a valid future expiry date (MM/YY).",
    cvc: /^\d{3}$/.test(card.cvc) ? "" : "Enter a 3-digit test security code.",
  };
}
