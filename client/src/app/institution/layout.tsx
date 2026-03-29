import { Navbar } from "@/components/navbar";

export default function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {children}
      </main>
    </>
  );
}
