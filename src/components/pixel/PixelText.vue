<script setup lang="ts">
import { computed } from 'vue'
import flagsData from 'pixel-flags/flags.json'

const props = defineProps<{
  text?: string | null
}>()

interface TextPart {
  type: 'text' | 'flag'
  content: string
  flagPath?: string
}

// Map 2-letter ISO country code -> SVG path from tgines/pixel-flags
const flagMap = new Map<string, string>()
const flagsList = ((flagsData as any).flags || flagsData) as Array<{ code: string; svg: string; png2x: string }>
for (const f of flagsList) {
  flagMap.set(f.code, f.svg)
}

// Regex matching Unicode flag emoji pairs (Regional Indicator Symbols U+1F1E6 to U+1F1FF)
const FLAG_REGEX = /([\uD83C][\uDDE6-\uDDFF]){2}/g

const parsedParts = computed<TextPart[]>(() => {
  const str = props.text || ''
  if (!str) return []

  const parts: TextPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = FLAG_REGEX.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: str.slice(lastIndex, match.index)
      })
    }

    const flagEmoji = match[0]
    const codePoints = [...flagEmoji].map(c => c.codePointAt(0)!)
    if (codePoints.length >= 2 && codePoints[0] >= 0x1F1E6 && codePoints[0] <= 0x1F1FF) {
      const c1 = String.fromCharCode(codePoints[0] - 0x1F1E6 + 65)
      const c2 = String.fromCharCode(codePoints[1] - 0x1F1E6 + 65)
      const countryCode = (c1 + c2).toLowerCase()
      const svgPath = flagMap.get(countryCode)

      if (svgPath) {
        parts.push({
          type: 'flag',
          content: countryCode,
          flagPath: `https://cdn.jsdelivr.net/gh/tgines/pixel-flags@main/${svgPath}`
        })
      } else {
        parts.push({
          type: 'flag',
          content: countryCode,
          flagPath: `https://flagcdn.com/20x15/${countryCode}.png`
        })
      }
    } else {
      parts.push({
        type: 'text',
        content: flagEmoji
      })
    }

    lastIndex = FLAG_REGEX.lastIndex
  }

  if (lastIndex < str.length) {
    parts.push({
      type: 'text',
      content: str.slice(lastIndex)
    })
  }

  return parts
})
</script>

<template>
  <span class="pixel-text-wrap">
    <template v-for="(part, idx) in parsedParts" :key="idx">
      <span v-if="part.type === 'text'">{{ part.content }}</span>
      <img
        v-else-if="part.type === 'flag'"
        :src="part.flagPath"
        :alt="part.content.toUpperCase()"
        class="pixel-flag-icon"
      />
    </template>
  </span>
</template>

<style scoped>
.pixel-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
}

.pixel-flag-icon {
  height: 0.9em;
  width: auto;
  aspect-ratio: 16 / 12;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  vertical-align: middle;
  border-radius: 1px;
  display: inline-block;
  margin: 0 1px;
  flex-shrink: 0;
}
</style>
