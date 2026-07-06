import { redirect } from "next/navigation";

export default function LibraryRootPage() {
    redirect("/library/movies");
}