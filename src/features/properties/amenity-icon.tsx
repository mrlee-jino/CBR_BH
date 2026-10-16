import { AirVent, Bath, CarFront, CookingPot, Shirt, Wifi } from "lucide-react";
import type { Amenity } from "./data";

const icons = {
  "Wi-Fi": Wifi,
  "Shared kitchen": CookingPot,
  "Air conditioning": AirVent,
  Parking: CarFront,
  "Laundry area": Shirt,
  "Private bathroom": Bath,
};
export function AmenityIcon({ name }: { name: Amenity }) {
  const Icon = icons[name];
  return <Icon size={17} strokeWidth={1.6} aria-hidden="true" />;
}
