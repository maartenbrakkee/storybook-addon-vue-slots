import { computed, type DefineComponent } from 'vue'
import type { Args, ArgsStoryFn, Renderer } from '@storybook/types'
import { wrappedTemplate } from './utils'
import type { VueRenderer } from '@storybook/vue3'

function toKebabCase(inputString: string) {
  return inputString
    .replace(/([A-Z])([A-Z])/g, "$1-$2")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function getArgString(key: string, value: any) {
  const isObject = typeof value !== 'string' && typeof value !== 'boolean';
  
  const valString = isObject ? JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'") : value;
  
  return `${isObject ? ':' : ''}${key}="${valString}"`;
}

export const renderWithSlots = <TRenderer extends Renderer, TArgs extends Record<string, any>>() => {
  const makeComponentTemplate = (component: string, slots: string, args: Args) => {
    const kebabComponent = toKebabCase(component)

  return `
    <${kebabComponent} ${Object.entries(args).map(([key, value]) => `${getArgString(key, value)}`).join(" ")}>
      ${slots}
    </${kebabComponent}>
  ` as const
  }

  return ((args, { viewMode, componentId, component, parameters }) => {
    const componentName = (component as DefineComponent).__name! || (component as { name: string }).name

    if (!parameters?.slots) {
      return {
        template: makeComponentTemplate(componentName, '', args),
        components: { [componentName]: component },
        setup: () => ({ args: computed(() => ({ ...args })) }),
      }
    }

    const slots = Object.entries(parameters.slots).reduce((acc, [currentSlotName, params]) => `${acc}\n${wrappedTemplate(typeof params === 'object' ? params.template : undefined, currentSlotName)}`, '')

    const components = Object.entries(parameters.slots).reduce((acc, [, params]) => ({...acc, ...(typeof params === 'object' ? params.components : {})}), {})

    // Fix for root-based components (overlays, modals, tooltips etc.)
    if (!component)
      throw new Error('No component provided to render')

    return {
      template: makeComponentTemplate(componentName, slots, args),
      components: { [componentName]: component, ...(components || {}) },
      setup: () => ({ args: computed(() => ({ ...args })) }),
    }
  }) as ArgsStoryFn<VueRenderer, TArgs>
}

export default renderWithSlots
