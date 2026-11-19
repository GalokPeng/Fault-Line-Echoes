import { avatarLook } from './avatar.js'
import { skins } from './story.js'

// Transparent portraits are rendered from the playable models, including their costume trim.
// Explicit inline imports keep the shareable single-file edition self-contained.
const pictures = import.meta.glob('./avatar-portraits/*.webp', {
  eager: true,
  query: '?inline',
  import: 'default',
})
export function avatarPortrait(role, skin) {
  const look = avatarLook(role, skin)
  const costume = Object.keys(skins).indexOf(look.skin)
  return pictures['./avatar-portraits/' + look.role + '-' + costume + '.webp']
}
