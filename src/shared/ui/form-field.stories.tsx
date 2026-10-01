import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { FormField } from "./form-field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Button } from "./button";

const meta = {
  title: "Patrones/FormField",
  component: FormField,
  args: {
    label: "Nombre público",
    description: "Así aparecerá tu nombre en los aportes.",
    children: (props) => <Input {...props} placeholder="Tu nombre" />,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const Invalid: Story = {
  args: { required: true, error: "Escribe al menos 3 caracteres." },
};
export const Disabled: Story = {
  args: {
    children: (props) => (
      <Input {...props} disabled value="Nombre no editable" readOnly />
    ),
  },
};
export const LongText: Story = {
  args: {
    label: "Tu propuesta",
    description: "Describe una acción y el beneficio esperado.",
    children: (props) => <Textarea {...props} placeholder="Mi propuesta es…" />,
  },
};
function ValidatedForm() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-4"
    >
      <FormField
        label="Nombre público"
        required
        error={
          submitted && value.trim().length < 3
            ? "Escribe al menos 3 caracteres."
            : undefined
        }
      >
        {(props) => (
          <Input
            {...props}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
      </FormField>
      <Button type="submit">Guardar</Button>
    </form>
  );
}
export const Validation: Story = {
  render: () => <ValidatedForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Guardar" }));
    await expect(
      canvas.getByRole("textbox", { name: "Nombre público" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Escribe al menos 3 caracteres.",
    );
    await userEvent.type(canvas.getByRole("textbox"), "Ana");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
