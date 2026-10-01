import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function TextoEditor({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <FormField label={label}>
      {(control) =>
        multiline ? (
          <Textarea
            {...control}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            {...control}
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </FormField>
  );
}
export function OpcionEditor({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <FormField label={label}>
      {(control) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger {...control} className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
export function MarcaEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <FormField label={label}>
      {(control) => (
        <Checkbox
          {...control}
          checked={value}
          onCheckedChange={(v) => onChange(v === true)}
        />
      )}
    </FormField>
  );
}
