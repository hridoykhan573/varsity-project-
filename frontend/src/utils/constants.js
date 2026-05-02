// Pet type → emoji
export const PET_EMOJI = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐇', fish: '🐠', reptile: '🦎', hamster: '🐹', other: '🐾' }

// Status → badge class
export const STATUS_BADGE = {
  available: 'badge-green', unavailable: 'badge-red', adopted: 'badge-blue', sold: 'badge-purple',
  boarding: 'badge-yellow', pending: 'badge-orange',
  confirmed: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red',
  rejected: 'badge-red', in_progress: 'badge-yellow',
  accepted: 'badge-green',
}

export const LISTING_BADGE = { adoption: 'badge-green', sale: 'badge-orange' }

export const PET_TYPES = ['dog','cat','bird','rabbit','fish','reptile','hamster','other']
export const SERVICE_TYPES = ['boarding','grooming','vaccination','training','daycare','veterinary','bath','other']

export const BOOTCAMP_TYPES = ['training', 'breeding', 'vaccination']
export const BOOTCAMP_EMOJI = { training: '🎓', breeding: '🐾', vaccination: '💉' }
