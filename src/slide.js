const SongReconciler = reconciler({
  createInstance(
    type,
    props,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle
  ) {
    const songElement = createSongElement(
      type,
      props,
      rootContainerInstance,
      internalInstanceHandle
    );

    return songElement;
  },
