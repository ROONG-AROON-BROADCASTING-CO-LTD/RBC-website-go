import type { Vehicle } from "../../src/lib/domain";
import sampleVehicles from "./vehicles.json";
import { initialSearch as emptySearch } from "../../src/lib/domain";

// Test fixtures are never imported by the application.
export const vehicles = sampleVehicles as Vehicle[];
export const vehicleById = (id: string) =>
  vehicles.find((vehicle) => vehicle.id === id);
export const initialSearch = {
  ...emptySearch,
  date: "2026-11-15",
  returnDate: "2026-11-16",
};
