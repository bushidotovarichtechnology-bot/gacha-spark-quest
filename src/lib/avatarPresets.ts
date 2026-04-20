import dinoGreen from "@/assets/avatars/dino-green.png";
import dinoBlue from "@/assets/avatars/dino-blue.png";
import dinoRed from "@/assets/avatars/dino-red.png";
import dinoYellow from "@/assets/avatars/dino-yellow.png";
import dinoPurple from "@/assets/avatars/dino-purple.png";
import dinoPink from "@/assets/avatars/dino-pink.png";

export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "dino-green", label: "Hijau", src: dinoGreen },
  { id: "dino-blue", label: "Biru", src: dinoBlue },
  { id: "dino-red", label: "Merah", src: dinoRed },
  { id: "dino-yellow", label: "Kuning", src: dinoYellow },
  { id: "dino-purple", label: "Ungu", src: dinoPurple },
  { id: "dino-pink", label: "Pink", src: dinoPink },
];
