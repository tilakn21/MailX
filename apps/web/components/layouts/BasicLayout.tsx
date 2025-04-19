import { Header } from "@/app/(landing)/home/Header";

export function BasicLayout(props: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <Header />
      <main className="isolate">{props.children}</main>
    </div>
  );
}
