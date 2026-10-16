export const unitTypes = [
  { value: "bedspace", label: "Bedspace" },
  { value: "private-room", label: "Private room" },
  { value: "apartment", label: "Apartment" },
] as const;

export type UnitType = (typeof unitTypes)[number]["value"];
export type Amenity =
  "Wi-Fi" | "Shared kitchen" | "Air conditioning" | "Parking" | "Laundry area" | "Private bathroom";

export type Property = {
  slug: string;
  name: string;
  barangay: string;
  type: UnitType;
  price: number;
  deposit: number;
  image: string;
  palette: string;
  highlight: string;
  description: string;
  amenities: Amenity[];
  utilities: string;
  units: { label: string; price: number; note: string }[];
};

// Entirely fictional fixtures, never proof of an available or verified property.
export const properties: Property[] = [
  {
    slug: "amihan-garden-house",
    name: "Amihan Garden House",
    barangay: "Caasinan",
    type: "private-room",
    price: 3800,
    deposit: 3800,
    image: "/images/garden-room.svg",
    palette: "sage",
    highlight: "A little room to breathe",
    description:
      "A light-filled private room imagined for slower mornings and a comfortable daily routine. A shared kitchen, leafy courtyard, and a dedicated place to study make this sample home an easy place to picture your next chapter.",
    amenities: ["Wi-Fi", "Shared kitchen", "Laundry area"],
    utilities: "Sample terms: Wi-Fi included. Electricity and water billed separately.",
    units: [
      { label: "Garden room", price: 3800, note: "Private room · shared bathroom" },
      { label: "Courtyard room", price: 4200, note: "Larger private room · shared bathroom" },
    ],
  },
  {
    slug: "balay-sidlak-bedspaces",
    name: "Balay Sidlak Bedspaces",
    barangay: "Poblacion 9",
    type: "bedspace",
    price: 1800,
    deposit: 1800,
    image: "/images/shared-room.svg",
    palette: "peach",
    highlight: "Small budget, fresh start",
    description:
      "An imagined shared home with individual beds, a communal kitchen, and a spot for your everyday essentials. This sample shows how a simple monthly bedspace can feel considered and welcoming.",
    amenities: ["Wi-Fi", "Shared kitchen", "Laundry area"],
    utilities: "Sample terms: Wi-Fi and water included. Electricity shared between occupants.",
    units: [
      { label: "Room A · Bed 1", price: 1800, note: "One individual bedspace · shared bathroom" },
      { label: "Room A · Bed 2", price: 1800, note: "One individual bedspace · shared bathroom" },
    ],
  },
  {
    slug: "acacia-apartments",
    name: "The Acacia Apartments",
    barangay: "Poblacion 11",
    type: "apartment",
    price: 6500,
    deposit: 6500,
    image: "/images/terracotta-apartment.svg",
    palette: "sand",
    highlight: "Your own everyday escape",
    description:
      "An independently rented sample apartment with a warm living area, private bathroom, and room to settle in. Designed in this preview for renters who want a little more space and a place of their own.",
    amenities: ["Private bathroom", "Parking", "Air conditioning"],
    utilities: "Sample terms: Electricity, water, and internet arranged separately.",
    units: [{ label: "Apartment 1", price: 6500, note: "Entire apartment · private bathroom" }],
  },
  {
    slug: "little-palm-studios",
    name: "Little Palm Studios",
    barangay: "Mabini",
    type: "apartment",
    price: 5200,
    deposit: 5200,
    image: "/images/palm-studio.svg",
    palette: "sage",
    highlight: "Less space. More possibility.",
    description:
      "A compact, fictional studio with a small dining nook and an easygoing feel. This example brings the essentials together for an independent monthly stay.",
    amenities: ["Private bathroom", "Wi-Fi", "Air conditioning"],
    utilities: "Sample terms: Wi-Fi included. Electricity and water billed separately.",
    units: [
      { label: "Palm studio", price: 5200, note: "Entire studio apartment · private bathroom" },
    ],
  },
  {
    slug: "luntian-corner-rooms",
    name: "Luntian Corner Rooms",
    barangay: "Caasinan",
    type: "private-room",
    price: 3200,
    deposit: 3200,
    image: "/images/quiet-room.svg",
    palette: "sand",
    highlight: "Make room for your routine",
    description:
      "A fictional corner room with a study desk and soft afternoon light. Shared facilities keep this example straightforward for someone starting a new semester or a new job.",
    amenities: ["Wi-Fi", "Shared kitchen", "Parking"],
    utilities: "Sample terms: Utilities are billed separately; Wi-Fi is included.",
    units: [{ label: "Corner room", price: 3200, note: "Private room · shared bathroom" }],
  },
  {
    slug: "casa-aurora-bedspaces",
    name: "Casa Aurora Bedspaces",
    barangay: "Poblacion 2",
    type: "bedspace",
    price: 2200,
    deposit: 2200,
    image: "/images/aurora-room.svg",
    palette: "peach",
    highlight: "A comfortable place to begin",
    description:
      "A bright shared-room concept with individual sleeping spaces and a communal kitchen. This sample listing illustrates a budget-conscious home base for your daily life in Cabadbaran.",
    amenities: ["Shared kitchen", "Laundry area", "Air conditioning"],
    utilities: "Sample terms: Water included. Electricity shared between occupants.",
    units: [
      { label: "Room B · Bed 1", price: 2200, note: "One individual bedspace · shared bathroom" },
    ],
  },
];

export const barangays = [...new Set(properties.map((property) => property.barangay))].sort();
export const typeLabel = (type: UnitType) => unitTypes.find((item) => item.value === type)!.label;
export const getProperty = (slug: string) => properties.find((property) => property.slug === slug);
