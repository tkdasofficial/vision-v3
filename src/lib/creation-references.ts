import portrait from "@/assets/reference-1.jpg";
import perfume from "@/assets/reference-2.jpg";
import coast from "@/assets/reference-3.jpg";
import car from "@/assets/reference-4.jpg";
import fox from "@/assets/reference-5.jpg";
import house from "@/assets/reference-6.jpg";
import astronaut from "@/assets/reference-7.jpg";
import flowers from "@/assets/reference-8.jpg";

export type CreationMode = "images" | "videos";
export const creationReferences = [
  { image: portrait, name: "Editorial portrait", prompt: "An editorial portrait of a woman in a red jacket against a pink studio backdrop", motion: "Slow camera push in as she turns toward the camera" },
  { image: perfume, name: "Product studio", prompt: "A cobalt-blue perfume bottle on a bright yellow background, luxury product photography", motion: "Smooth orbit around the bottle with moving studio reflections" },
  { image: coast, name: "Ocean escape", prompt: "An aerial view of a turquoise coastline with white waves and dramatic cliffs", motion: "A drone glides along the coast as waves roll ashore" },
  { image: car, name: "Automotive", prompt: "A silver futuristic sports car in crisp daylight, cinematic automotive photography", motion: "A low tracking shot follows the car driving along the road" },
  { image: fox, name: "Wildlife", prompt: "A red fox in a vivid green forest, detailed cinematic wildlife photography", motion: "The fox walks through the forest while the camera tracks gently" },
  { image: house, name: "Architecture", prompt: "A modern white architectural house surrounded by green trees in daylight", motion: "A slow architectural fly-through moves toward the glass entrance" },
  { image: astronaut, name: "Beyond Earth", prompt: "An astronaut on the moon with Earth visible above the horizon, cinematic realism", motion: "The astronaut takes slow steps across the lunar surface, tracking camera" },
  { image: flowers, name: "Glass garden", prompt: "Colorful translucent glass flowers in pink, teal and yellow, macro art photography", motion: "A macro camera drifts through the flowers as light refracts through glass" },
];

export function referencePrompt(index: number, mode: CreationMode) {
  const reference = creationReferences[index];
  if (!reference) return "";
  return mode === "images" ? `Create an image: ${reference.prompt}. Square composition.` : `Create a video: ${reference.prompt}. ${reference.motion}. Square composition.`;
}