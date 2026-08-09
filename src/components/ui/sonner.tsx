import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1C1C21] group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-black/50 group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-white/60",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-white group-[.toast]:shadow-md group-[.toast]:shadow-primary/30",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/70",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
