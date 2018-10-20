/**
 * Copyright (c) 2018-present, Raphael Amorim.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import reconciler from 'react-reconciler';
import { createElement } from './component';

const SongReconciler = reconciler({
  appendInitialChild(parentInstance, child) {
    const { type } = child;
    if (type === 'notes') {
      parentInstance.addSequence(child.notes);
    }

    if (type === 'midi') {
      parentInstance.setMIDI(child.midi);
    }
  },

  createInstance(
    type,
    props,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle
  ) {
    const element = createElement(
      type,
      props,
      rootContainerInstance,
      internalInstanceHandle
    );

    return element;
  },

  createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    return text;
  },

  finalizeInitialChildren(element, type, props) {
    if (type === 'Song') {
      window.sequencer.ready(() => {
        element.render();
      });
    }
  },

  getPublicInstance(inst) {
    return inst;
  },

  prepareForCommit(rootContainerInstance) {},

  prepareUpdate(element, type, oldProps, newProps, rootContainerInstance) {
    // noop
  },

  resetAfterCommit(rootContainerInstance) {
    // noop
  },

  resetTextContent(element) {
    // noop
  },

  getRootHostContext(rootInstance) {
    // noop
  },

  getChildHostContext() {
    return {};
  },

  scheduleAnimationCallback() {},

  scheduleDeferredCallback() {},

  useSyncScheduling: false,

  now: Date.now,

  mutation: {
    appendChild(parentInstance, child) {
      // noop
    },

    appendChildToContainer(parentInstance, child) {
      // noop
    },

    removeChild(parentInstance, child) {
      // noop
    },

    removeChildFromContainer(parentInstance, child) {
      // noop
    },

    insertBefore(parentInstance, child, beforeChild) {},

    commitUpdate(instance, updatePayload, type, oldProps, newProps) {},

    commitMount(instance, updatePayload, type, oldProps, newProps) {},

    commitTextUpdate(textInstance, oldText, newText) {
      // textInstance.children = newText;
    },
  },

  shouldSetTextContent(props) {
    return (
      typeof props.children === 'string' || typeof props.children === 'number'
    );
  },
});

const defaultContainer = {};
const roots = typeof WeakMap === 'function' ? new WeakMap() : new Map();

const ReactSongRenderer = {
  render(element, container, callback) {
    const containerKey = container == null ? defaultContainer : container;
    let root = roots.get(containerKey);
    if (!root) {
      root = SongReconciler.createContainer(containerKey);
      roots.set(container, root);
    }

    SongReconciler.updateContainer(element, root, null, callback);

    SongReconciler.injectIntoDevTools({
      bundleType: 1, // 1 = development / 0 = production
      version: '1.0.0',
      rendererPackageName: 'React Song',
      findHostInstanceByFiber: SongReconciler.findHostInstance,
    });

    return SongReconciler.getPublicRootInstance(root);
  },
};

export default ReactSongRenderer;
