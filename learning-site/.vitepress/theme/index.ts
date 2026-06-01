import DefaultTheme from 'vitepress/theme'
import FlowStepper from './components/FlowStepper.vue'
import CodeReference from './components/CodeReference.vue'
import FeatureGateExplorer from './components/FeatureGateExplorer.vue'
import DecisionTree from './components/DecisionTree.vue'
import SpriteAnimator from './components/SpriteAnimator.vue'
import ArchitectureMap from './components/ArchitectureMap.vue'
import './styles/index.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('FlowStepper', FlowStepper)
    app.component('CodeReference', CodeReference)
    app.component('FeatureGateExplorer', FeatureGateExplorer)
    app.component('DecisionTree', DecisionTree)
    app.component('SpriteAnimator', SpriteAnimator)
    app.component('ArchitectureMap', ArchitectureMap)
  },
}
