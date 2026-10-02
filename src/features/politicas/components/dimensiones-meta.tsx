import { DEPENDENCIAS_CARTAGENA_2026 } from "../data/entidades-cartagena.data";
import {
  Coins,
  Wheat,
  HeartPulse,
  Leaf,
  Shield,
  Users,
  Landmark,
} from "lucide-react";
export const DIMENSIONES_META = {
  economica: { Icon: Coins, color: "text-warning" },
  alimentaria: { Icon: Wheat, color: "text-warning" },
  salud: { Icon: HeartPulse, color: "text-danger" },
  ambiental: { Icon: Leaf, color: "text-success" },
  personal: { Icon: Shield, color: "text-danger" },
  comunitaria: { Icon: Users, color: "text-ember" },
  politica: { Icon: Landmark, color: "text-info" },
};
export function dimensionMeta(codigo: string) {
  return (
    DIMENSIONES_META[codigo as keyof typeof DIMENSIONES_META] ?? {
      Icon: Shield,
      color: "text-text-secondary",
    }
  );
}
export const ENTIDADES = DEPENDENCIAS_CARTAGENA_2026.map(
  (entidad) => entidad.nombre,
);
