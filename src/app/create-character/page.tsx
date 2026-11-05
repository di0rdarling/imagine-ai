import { redirect } from "next/navigation";

export default function CreateCharacterRedirect() {
  redirect("/characters/new");
}
