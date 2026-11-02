// The Wardrobe itself has no drawer. Without this, a soft navigation from an open
// drawer back to /wardrobe (a piece's "looks that wear it") keeps the slot's last
// state, and the drawer stays open over the list it just changed.
export default function NoDrawerOnTheWardrobe() {
  return null;
}
