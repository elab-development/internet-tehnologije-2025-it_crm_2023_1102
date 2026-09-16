import { redirect } from "next/navigation";

// Početna ruta preusmerava korisnika na login stranicu.
export default function HomePage() {
  redirect("/pages/login");
}