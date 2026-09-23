import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:shadow-2xl group-[.toaster]:shadow-background/80",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:shadow-md group-[.toast]:shadow-primary/20",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-foreground/70",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
