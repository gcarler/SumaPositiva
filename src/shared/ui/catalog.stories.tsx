import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Info,
  Landmark,
  Users,
  Star,
  List,
  Grid2X2,
  Share2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BarChart, Bar, CartesianGrid, XAxis } from "recharts";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Checkbox } from "./checkbox";
import { Switch } from "./switch";
import { Slider } from "./slider";
import { Progress } from "./progress";
import { Separator } from "./separator";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";
import { Alert, AlertTitle, AlertDescription } from "./alert";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./breadcrumb";
import { Calendar } from "./calendar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./collapsible";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "./command";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "./context-menu";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "./drawer";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./alert-dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./sheet";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "./hover-card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "./input-otp";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "./menubar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "./navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "./pagination";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable";
import { ScrollArea } from "./scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";
import { Skeleton } from "./skeleton";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "./sidebar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "./carousel";
import { AspectRatio } from "./aspect-ratio";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table";
import {
  Form,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./form";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Textarea } from "./textarea";
import { Toggle } from "./toggle";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastViewport,
  ToastClose,
} from "./toast";
import { Toaster } from "./sonner";
import { Button } from "./button";

const meta = {
  title: "Componentes/Catálogo de primitivos",
  parameters: {
    docs: {
      description: {
        component:
          "Primitivos de la biblioteca Radix/shadcn, adaptados a los tokens POLIS. Cada historia demuestra un componente real; los patrones de la plataforma se documentan por separado.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function LegacyFormDemo() {
  const form = useForm({ defaultValues: { nombre: "" } });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => {})}
        className="max-w-sm space-y-4"
      >
        <RHFFormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la mesa</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                Este patrón integra React Hook Form.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}

export const InputExample: Story = {
  name: "Input",
  render: () => (
    <Input
      aria-label="Nombre de la mesa"
      placeholder="Nombre de la mesa"
      className="max-w-md"
    />
  ),
};
export const LabelExample: Story = {
  name: "Label",
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="catalog-label">Nombre público</Label>
      <Input id="catalog-label" className="max-w-md" />
    </div>
  ),
};
export const BadgeExample: Story = {
  name: "Badge",
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Principal</Badge>
      <Badge variant="outline">Programada</Badge>
      <Badge variant="ember">Consulta pública</Badge>
      <Badge variant="success">Aprobada</Badge>
      <Badge variant="warning">En revisión</Badge>
    </div>
  ),
};
export const CardExample: Story = {
  name: "Card",
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Mesa territorial</CardTitle>
        <CardDescription>Construyamos acuerdos para el barrio.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          12 participantes · 3 submesas
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Ver mesa</Button>
      </CardFooter>
    </Card>
  ),
};
export const CheckboxExample: Story = {
  name: "Checkbox",
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="catalog-consent" />
      <Label htmlFor="catalog-consent">Acepto publicar mi aporte</Label>
    </div>
  ),
};
export const SwitchExample: Story = {
  name: "Switch",
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="catalog-notifications" />
      <Label htmlFor="catalog-notifications">Recibir novedades</Label>
    </div>
  ),
};
export const SliderExample: Story = {
  name: "Slider",
  render: () => (
    <div className="max-w-sm space-y-4">
      <p className="text-sm">Prioridad de la propuesta</p>
      <Slider
        aria-label="Prioridad de la propuesta"
        defaultValue={[40]}
        max={100}
        step={1}
      />
    </div>
  ),
};
export const ProgressExample: Story = {
  name: "Progress",
  render: () => (
    <div className="max-w-md space-y-3">
      <p className="text-sm">Avance de formulación · 45%</p>
      <Progress value={45} aria-label="Avance de formulación" />
    </div>
  ),
};
export const SeparatorExample: Story = {
  name: "Separator",
  render: () => (
    <div className="max-w-sm space-y-4">
      <p className="text-sm">Información de la política</p>
      <Separator />
      <p className="text-sm text-text-secondary">Participación ciudadana</p>
    </div>
  ),
};
export const AccordionExample: Story = {
  name: "Accordion",
  render: () => (
    <Accordion type="single" collapsible className="max-w-xl">
      <AccordionItem value="participation">
        <AccordionTrigger>¿Cómo puedo participar?</AccordionTrigger>
        <AccordionContent>
          Explora una política y aporta en una de sus líneas estratégicas.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="privacy">
        <AccordionTrigger>¿Puedo participar de forma anónima?</AccordionTrigger>
        <AccordionContent>
          Sí. Puedes elegir una sesión anónima antes de publicar.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
export const AlertExample: Story = {
  name: "Alert",
  render: () => (
    <Alert className="max-w-xl">
      <Info />
      <AlertTitle>Tu aporte es público</AlertTitle>
      <AlertDescription>
        Evita incluir datos personales de terceros.
      </AlertDescription>
    </Alert>
  ),
};
export const AvatarExample: Story = {
  name: "Avatar",
  render: () => (
    <div className="flex gap-4">
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="/logo.svg" alt="POLIS" />
        <AvatarFallback>PO</AvatarFallback>
      </Avatar>
    </div>
  ),
};
export const BreadcrumbExample: Story = {
  name: "Breadcrumb",
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#politicas">Políticas</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#formulacion">Formulación</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>LE-01</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
export const CalendarExample: Story = {
  name: "Calendar",
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={new Date(2026, 9, 1)}
      selected={new Date(2026, 9, 15)}
      className="rounded-xl border border-border"
    />
  ),
};
export const CollapsibleExample: Story = {
  name: "Collapsible",
  render: () => (
    <Collapsible className="max-w-md space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="outline">Ver metodología</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-xl border border-border p-4 text-sm text-text-secondary">
        Diagnóstico, formulación, deliberación y seguimiento.
      </CollapsibleContent>
    </Collapsible>
  ),
};
export const CommandExample: Story = {
  name: "Command",
  render: () => (
    <Command className="max-w-sm rounded-xl border border-border">
      <CommandInput
        aria-label="Buscar acciones"
        placeholder="Buscar una acción…"
      />
      <CommandList>
        <CommandEmpty>No hay resultados.</CommandEmpty>
        <CommandGroup heading="Participación">
          <CommandItem>Explorar políticas</CommandItem>
          <CommandItem>Crear una mesa</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Cuenta">
          <CommandItem>Cambiar forma de participar</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
export const DropdownMenuExample: Story = {
  name: "DropdownMenu",
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Acciones de la mesa</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Mesa territorial</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Editar información</DropdownMenuItem>
        <DropdownMenuItem>Exportar acuerdos</DropdownMenuItem>
        <DropdownMenuItem>Archivar mesa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
export const ContextMenuExample: Story = {
  name: "ContextMenu",
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-32 max-w-sm items-center justify-center rounded-xl border border-dashed border-border-strong p-6 text-sm text-text-secondary">
        Clic derecho para ver acciones
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Editar nodo</ContextMenuItem>
        <ContextMenuItem>Duplicar nodo</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
export const DrawerExample: Story = {
  name: "Drawer",
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Ver resumen</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Resumen de la mesa</DrawerTitle>
          <DrawerDescription>
            12 participantes construyeron 3 acuerdos.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>Cerrar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
export const DialogExample: Story = {
  name: "Dialog",
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Abrir panel lateral</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de la participación</DialogTitle>
          <DialogDescription>
            Este primitivo abre lateralmente. Para apilado, utiliza SidePanel
            con el host de la aplicación.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
export const AlertDialogExample: Story = {
  name: "AlertDialog",
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Descartar borrador</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar este borrador?</AlertDialogTitle>
          <AlertDialogDescription>
            El texto que aún no publicaste se eliminará de este formulario.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Conservar borrador</AlertDialogCancel>
          <AlertDialogAction>Descartar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
export const SheetExample: Story = {
  name: "Sheet",
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Abrir ficha</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ficha de la política</SheetTitle>
          <SheetDescription>
            Información pública de la consulta en curso.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
export const HoverCardExample: Story = {
  name: "HoverCard",
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a
          href="#equipo"
          className="text-sm text-ember underline underline-offset-4"
        >
          Equipo facilitador
        </a>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="font-medium">Equipo de participación</p>
        <p className="mt-2 text-sm text-text-secondary">
          Acompaña las mesas y sistematiza los acuerdos.
        </p>
      </HoverCardContent>
    </HoverCard>
  ),
};
export const InputOTPExample: Story = {
  name: "InputOTP",
  render: () => (
    <div className="space-y-3">
      <p className="text-sm">Código de verificación</p>
      <InputOTP maxLength={6} aria-label="Código de verificación">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  ),
};
export const MenubarExample: Story = {
  name: "Menubar",
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Mesa</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Crear submesa</MenubarItem>
          <MenubarItem>Guardar acuerdos</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Exportar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Ver</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Árbol de problemas</MenubarItem>
          <MenubarItem>Árbol de soluciones</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
export const NavigationMenuExample: Story = {
  name: "NavigationMenu",
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Participación</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-64 gap-2 p-4">
              <NavigationMenuLink href="#politicas">
                Políticas públicas
              </NavigationMenuLink>
              <NavigationMenuLink href="#mesas">
                Mesas de trabajo
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
export const PaginationExample: Story = {
  name: "Pagination",
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#anterior" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#pagina-1" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#pagina-2">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#siguiente" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
export const PopoverExample: Story = {
  name: "Popover",
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Ayuda sobre los aportes</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm leading-relaxed">
          Puedes proponer una acción, añadir una anotación o hacer una pregunta.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
export const RadioGroupExample: Story = {
  name: "RadioGroup",
  render: () => (
    <RadioGroup defaultValue="publica" aria-label="Visibilidad del aporte">
      <div className="flex items-center gap-3">
        <RadioGroupItem id="radio-publica" value="publica" />
        <Label htmlFor="radio-publica">Público</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem id="radio-borrador" value="borrador" />
        <Label htmlFor="radio-borrador">Borrador</Label>
      </div>
    </RadioGroup>
  ),
};
export const ResizableExample: Story = {
  name: "Resizable",
  render: () => (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-48 max-w-3xl rounded-xl border border-border"
    >
      <ResizablePanel defaultSize={35}>
        <div className="p-6 text-sm">Instrumentos</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65}>
        <div className="p-6 text-sm text-text-secondary">
          Espacio de trabajo
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
export const ScrollAreaExample: Story = {
  name: "ScrollArea",
  render: () => (
    <ScrollArea
      className="h-48 max-w-sm rounded-xl border border-border p-4"
      aria-label="Lista de propuestas"
      tabIndex={0}
    >
      {Array.from({ length: 15 }, (_, index) => (
        <p key={index} className="border-b border-border py-3 text-sm">
          Propuesta ciudadana {index + 1}
        </p>
      ))}
    </ScrollArea>
  ),
};
export const SelectExample: Story = {
  name: "Select",
  render: () => (
    <Select defaultValue="movilidad">
      <SelectTrigger className="w-64" aria-label="Sector de la política">
        <SelectValue placeholder="Selecciona un sector" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="movilidad">Movilidad</SelectItem>
        <SelectItem value="salud">Salud</SelectItem>
        <SelectItem value="ambiente">Ambiente</SelectItem>
      </SelectContent>
    </Select>
  ),
};
export const SkeletonExample: Story = {
  name: "Skeleton",
  render: () => (
    <div
      role="status"
      aria-label="Cargando información"
      className="max-w-sm space-y-3"
    >
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
};
export const SidebarExample: Story = {
  name: "Sidebar",
  render: () => (
    <SidebarProvider className="min-h-96">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <p className="p-2 text-sm font-semibold">POLIS</p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Participación</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Políticas">
                  <Landmark />
                  <span>Políticas públicas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Mesas">
                  <Users />
                  <span>Mesas de trabajo</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="p-4">
        <SidebarTrigger aria-label="Alternar navegación lateral" />
        <p className="mt-6 text-sm text-text-secondary">
          Navegación alternativa para espacios de administración.
        </p>
      </div>
    </SidebarProvider>
  ),
};
export const CarouselExample: Story = {
  name: "Carousel",
  render: () => (
    <Carousel className="mx-12 max-w-sm" aria-label="Ejemplos de participación">
      <CarouselContent>
        {["Diagnóstico", "Formulación", "Deliberación"].map((label) => (
          <CarouselItem key={label}>
            <Card>
              <CardContent className="flex h-40 items-center justify-center pt-6">
                <p className="font-medium">{label}</p>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};
export const AspectRatioExample: Story = {
  name: "AspectRatio",
  render: () => (
    <div className="max-w-md overflow-hidden rounded-xl border border-border">
      <AspectRatio
        ratio={16 / 9}
        className="flex items-center justify-center bg-surface-2"
      >
        <Landmark className="size-12 text-text-tertiary" aria-hidden="true" />
        <span className="sr-only">Superficie de imagen en proporción 16:9</span>
      </AspectRatio>
    </div>
  ),
};
export const TableExample: Story = {
  name: "Table",
  render: () => (
    <Table>
      <TableCaption>Resumen de participación de las mesas</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Mesa</TableHead>
          <TableHead>Participantes</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Movilidad segura</TableCell>
          <TableCell>12</TableCell>
          <TableCell>
            <Badge variant="ember">En curso</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Cuidado comunitario</TableCell>
          <TableCell>18</TableCell>
          <TableCell>
            <Badge variant="outline">Programada</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
export const FormExample: Story = {
  name: "Form",
  render: () => <LegacyFormDemo />,
};
export const ChartExample: Story = {
  name: "Chart",
  render: () => (
    <ChartContainer
      className="h-64 w-full max-w-xl"
      config={{ aportes: { label: "Aportes", color: "var(--chart-1)" } }}
    >
      <BarChart
        accessibilityLayer
        data={[
          { fase: "Diagnóstico", aportes: 24 },
          { fase: "Formulación", aportes: 38 },
          { fase: "Deliberación", aportes: 19 },
        ]}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="fase" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="aportes" fill="var(--color-aportes)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
export const TabsExample: Story = {
  name: "Tabs",
  render: () => (
    <Tabs defaultValue="problemas" className="max-w-xl">
      <TabsList aria-label="Tipo de árbol">
        <TabsTrigger value="problemas">Problemas</TabsTrigger>
        <TabsTrigger value="soluciones">Soluciones</TabsTrigger>
      </TabsList>
      <TabsContent
        value="problemas"
        className="rounded-xl border border-border p-6 text-sm"
      >
        Identifica el problema central, las causas y los efectos.
      </TabsContent>
      <TabsContent
        value="soluciones"
        className="rounded-xl border border-border p-6 text-sm"
      >
        Transforma las causas en medios y los efectos en fines.
      </TabsContent>
    </Tabs>
  ),
};
export const TextareaExample: Story = {
  name: "Textarea",
  render: () => (
    <Textarea
      aria-label="Tu propuesta"
      placeholder="Describe tu propuesta…"
      className="max-w-xl"
    />
  ),
};
export const ToggleExample: Story = {
  name: "Toggle",
  render: () => (
    <Toggle aria-label="Marcar como importante">
      <Star className="size-4" />
      Importante
    </Toggle>
  ),
};
export const ToggleGroupExample: Story = {
  name: "ToggleGroup",
  render: () => (
    <ToggleGroup
      type="single"
      defaultValue="lista"
      aria-label="Vista de resultados"
    >
      <ToggleGroupItem value="lista" aria-label="Vista de lista">
        <List className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="cuadricula" aria-label="Vista de cuadrícula">
        <Grid2X2 className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
export const TooltipExample: Story = {
  name: "Tooltip",
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Compartir política">
            <Share2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Compartir política</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
export const ToastExample: Story = {
  name: "Toast",
  render: () => (
    <ToastProvider>
      <Toast open duration={100000}>
        <ToastTitle>Aporte publicado</ToastTitle>
        <ToastDescription>
          Ejemplo del primitivo anterior de notificaciones.
        </ToastDescription>
        <ToastClose aria-label="Cerrar notificación" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};
export const SonnerExample: Story = {
  name: "Sonner",
  render: () => (
    <>
      <Toaster />
      <Button
        onClick={() =>
          toast.success("Aporte publicado", {
            description: "Tu propuesta ya aparece en la línea estratégica.",
          })
        }
      >
        Mostrar notificación
      </Button>
    </>
  ),
};
