import { GrowthCustomers } from "@/components/growth/GrowthCustomers";

export const GrowthOSTab = () => {
  return <GrowthCustomers initialTab="list" hiddenTabs={["crm"]} />;
};
