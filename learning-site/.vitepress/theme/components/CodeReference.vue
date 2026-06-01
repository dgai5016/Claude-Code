<template>
  <div class="code-reference">
    <div class="code-header">
      <span class="file-path">{{ filePath }}</span>
      <span v-if="lineRange" class="line-range">L{{ lineRange }}</span>
    </div>
    <div class="code-body">
      <pre><code :class="langClass">{{ code }}</code></pre>
      <div v-if="annotations.length" class="annotations">
        <div v-for="(ann, i) in annotations" :key="i" class="annotation">
          <span class="ann-marker">{{ ann.line }}</span>
          <span class="ann-text">{{ ann.text }}</span>
        </div>
      </div>
    </div>
    <div v-if="imports.length || importedBy.length" class="code-links">
      <div v-if="imports.length" class="link-group">
        <span class="link-label">导入自：</span>
        <span v-for="(imp, i) in imports" :key="i" class="link-item">{{ imp }}</span>
      </div>
      <div v-if="importedBy.length" class="link-group">
        <span class="link-label">被导入：</span>
        <span v-for="(imp, i) in importedBy" :key="i" class="link-item">{{ imp }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  filePath: { type: String, required: true },
  lineRange: { type: String, default: '' },
  code: { type: String, required: true },
  lang: { type: String, default: 'typescript' },
  annotations: { type: Array, default: () => [] },
  imports: { type: Array, default: () => [] },
  importedBy: { type: Array, default: () => [] }
})

const langClass = computed(() => `language-${props.lang}`)
</script>

<style scoped>
.code-reference {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 1.5rem 0;
  overflow: hidden;
}
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vp-c-default-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.85em;
}
.file-path {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
}
.line-range {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.code-body {
  display: flex;
}
.code-body pre {
  flex: 1;
  margin: 0;
  padding: 1rem;
  background: var(--vp-code-block-bg);
  overflow-x: auto;
  font-size: 0.85em;
  line-height: 1.6;
}
.annotations {
  min-width: 200px;
  max-width: 300px;
  padding: 0.5rem;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.8em;
}
.annotation {
  display: flex;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.annotation:last-child { border-bottom: none; }
.ann-marker {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  min-width: 24px;
}
.ann-text {
  color: var(--vp-c-text-2);
}
.code-links {
  padding: 8px 16px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-default-soft);
  font-size: 0.8em;
}
.link-group { margin: 2px 0; }
.link-label { color: var(--vp-c-text-3); }
.link-item {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 2px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}
</style>
