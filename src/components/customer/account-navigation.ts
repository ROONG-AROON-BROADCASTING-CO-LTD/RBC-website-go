import {
  CalendarDays,
  BriefcaseBusiness,
  FileCheck2,
  CreditCard,
  Heart,
  MessageCircle,
  Star,
  UserRound,
} from "lucide-react";

export const accountPrimaryLinks = [
  { id: "profile", label: "Customer details", icon: UserRound },
  { id: "bookings", label: "My Bookings", icon: CalendarDays },
  { id: "reviews", label: "My reviews", icon: Star },
  { id: "saved", label: "Saved items", icon: Heart },
] as const;

export const accountSecondaryLinks = [
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageCircle },
] as const;

export const partnerAccountLinks = [
  {
    path: "partner/overview",
    label: "Partner portal",
    icon: BriefcaseBusiness,
  },
  { path: "apply", label: "Application status", icon: FileCheck2 },
] as const;
