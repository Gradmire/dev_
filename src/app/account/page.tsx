import { redirect } from "next/navigation";

/** The account root has no content of its own; "my data" is the landing tab. */
export default function AccountIndexPage() {
  redirect("/account/data");
}
