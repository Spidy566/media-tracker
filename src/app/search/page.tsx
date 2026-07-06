import { redirect } from "next/navigation";

export default function SearchRootPage() {
    redirect("/search/movies");
}