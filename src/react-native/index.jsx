import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
} from 'react';

/**
 * Complete React Native Runtime Layer for Web & Mobile Preview
 * Supports: View, Text, ScrollView, FlatList, TouchableOpacity, Pressable,
 * TextInput, Modal, SafeAreaView, StatusBar, StyleSheet, Animated, Easing,
 * Dimensions, Platform, Vibration
 */

const UNITLESS_PROPS = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'opacity',
  'zIndex',
  'fontWeight',
  'elevation',
  'aspectRatio',
]);

export function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  if (typeof style === 'object') {
    return { ...style };
  }
  return {};
}

export function rnStyleToCss(rawStyle, isText = false) {
  const s = flattenStyle(rawStyle);
  const css = {
    boxSizing: 'border-box',
     ...(isText
      ? {
          margin: 0,
          padding: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minWidth: 0,
        }),
  };

  Object.entries(s).forEach(([key, val]) => {
    if (val === undefined || val === null) return;

    // Resolve AnimatedValue instances if passed inside style
    const resolvedVal =
      val && typeof val === 'object' && '_isAnimated' in val
        ? val.getValue()
        : val;

    switch (key) {
      case 'paddingHorizontal':
        css.paddingLeft = resolvedVal;
        css.paddingRight = resolvedVal;
        break;
      case 'paddingVertical':
        css.paddingTop = resolvedVal;
        css.paddingBottom = resolvedVal;
        break;
      case 'marginHorizontal':
        css.marginLeft = resolvedVal;
        css.marginRight = resolvedVal;
        break;
      case 'marginVertical':
        css.marginTop = resolvedVal;
        css.marginBottom = resolvedVal;
        break;
      case 'borderTopLeftRadius':
      case 'borderTopRightRadius':
      case 'borderBottomLeftRadius':
      case 'borderBottomRightRadius':
      case 'borderRadius':
        css[key] =
          typeof resolvedVal === 'number' ? `${resolvedVal}px` : resolvedVal;
        break;
      case 'borderWidth':
        css.borderWidth = `${resolvedVal}px`;
        css.borderStyle = 'solid';
        break;
      case 'borderTopWidth':
        css.borderTopWidth = `${resolvedVal}px`;
        css.borderTopStyle = 'solid';
        break;
      case 'borderBottomWidth':
        css.borderBottomWidth = `${resolvedVal}px`;
        css.borderBottomStyle = 'solid';
        break;
      case 'borderLeftWidth':
        css.borderLeftWidth = `${resolvedVal}px`;
        css.borderLeftStyle = 'solid';
        break;
      case 'borderRightWidth':
        css.borderRightWidth = `${resolvedVal}px`;
        css.borderRightStyle = 'solid';
        break;
      case 'transform':
        if (Array.isArray(resolvedVal)) {
          const parts = resolvedVal.map((tObj) => {
            const [tKey, rawTVal] = Object.entries(tObj)[0];
            const tVal =
              rawTVal && typeof rawTVal === 'object' && '_isAnimated' in rawTVal
                ? rawTVal.getValue()
                : rawTVal;
            if (tKey.startsWith('translate')) {
              return `${tKey}(${typeof tVal === 'number' ? `${tVal}px` : tVal})`;
            }
            if (tKey.startsWith('scale')) {
              return `${tKey}(${tVal})`;
            }
            if (tKey.startsWith('rotate')) {
              return `${tKey}(${tVal})`;
            }
            return '';
          });
          css.transform = parts.join(' ');
        }
        break;
      case 'shadowColor':
      case 'shadowOffset':
      case 'shadowOpacity':
      case 'shadowRadius':
      case 'elevation':
        break;
      default:
        if (
          typeof resolvedVal === 'number' &&
          !UNITLESS_PROPS.has(key)
        ) {
          css[key] = `${resolvedVal}px`;
        } else {
          css[key] = resolvedVal;
        }
    }
  });

  if (s.borderColor && !css.borderStyle && (s.borderWidth || s.borderTopWidth || s.borderBottomWidth)) {
    css.borderColor = s.borderColor;
  }

  return css;
}

export const StyleSheet = {
  create: (styles) => styles,
  flatten: flattenStyle,
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

export const View = forwardRef(({ style, children, onLayout, ...rest }, ref) => (
  <div ref={ref} style={rnStyleToCss(style, false)} {...rest}>
    {children}
  </div>
));

export const SafeAreaView = forwardRef(({ style, children, ...rest }, ref) => {
  const css = rnStyleToCss(style, false);
  if (!css.paddingTop) {
    css.paddingTop = 'var(--safe-top, 48px)';
  }
  return (
    <div ref={ref} style={css} {...rest}>
      {children}
    </div>
  );
});

export const Text = forwardRef(
  ({ style, numberOfLines, children, onPress, ...rest }, ref) => {
    const css = rnStyleToCss(style, true);
    if (numberOfLines === 1) {
      css.whiteSpace = 'nowrap';
      css.overflow = 'hidden';
      css.textOverflow = 'ellipsis';
      css.display = 'block';
    } else if (numberOfLines > 1) {
      css.display = '-webkit-box';
      css.WebkitLineClamp = numberOfLines;
      css.WebkitBoxOrient = 'vertical';
      css.overflow = 'hidden';
    } else {
      css.display = 'inline';
    }
    if (onPress) {
      css.cursor = 'pointer';
    }
    return (
      <span ref={ref} onClick={onPress} style={css} {...rest}>
        {children}
      </span>
    );
  }
);

export const ScrollView = forwardRef(
  (
    {
      style,
      contentContainerStyle,
      horizontal = false,
      showsVerticalScrollIndicator = true,
      showsHorizontalScrollIndicator = true,
      children,
      ...rest
    },
    ref
  ) => {
    const outerCss = {
      ...rnStyleToCss(style, false),
      overflowX: horizontal ? 'auto' : 'hidden',
      overflowY: horizontal ? 'hidden' : 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth:
        !showsVerticalScrollIndicator || !showsHorizontalScrollIndicator
          ? 'none'
          : 'thin',
    };
    const innerCss = {
      ...rnStyleToCss(contentContainerStyle, false),
      flexDirection: horizontal ? 'row' : 'column',
    };
    return (
      <div ref={ref} style={outerCss} {...rest}>
        <div style={innerCss}>{children}</div>
      </div>
    );
  }
);

export function FlatList({
  data = [],
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  ListHeaderComponent,
  contentContainerStyle,
  style,
  horizontal = false,
}) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      horizontal={horizontal}
    >
      {ListHeaderComponent
        ? typeof ListHeaderComponent === 'function'
          ? <ListHeaderComponent />
          : ListHeaderComponent
        : null}
      {data.length === 0
        ? ListEmptyComponent
          ? typeof ListEmptyComponent === 'function'
            ? <ListEmptyComponent />
            : ListEmptyComponent
          : null
        : data.map((item, index) => (
            <React.Fragment
              key={keyExtractor ? keyExtractor(item, index) : item.id || index}
            >
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
    </ScrollView>
  );
}

export const TouchableOpacity = forwardRef(
  (
    {
      style,
      onPress,
      disabled = false,
      activeOpacity = 0.72,
      children,
      ...rest
    },
    ref
  ) => {
    const [pressed, setPressed] = useState(false);
    const css = {
      ...rnStyleToCss(style, false),
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      transition: 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease',
      opacity: disabled
        ? (flattenStyle(style).opacity ?? 0.45)
        : pressed
        ? activeOpacity
        : flattenStyle(style).opacity ?? 1,
      transform: pressed && !disabled ? 'scale(0.97)' : cssTransformFromStyle(style),
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onMouseDown={() => !disabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => !disabled && setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onClick={(e) => {
          if (!disabled && onPress) onPress(e);
        }}
        style={css}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

function cssTransformFromStyle(style) {
  const s = flattenStyle(style);
  if (!s.transform) return undefined;
  return rnStyleToCss({ transform: s.transform }).transform;
}

export const Pressable = forwardRef(
  ({ style, onPress, disabled = false, children, ...rest }, ref) => {
    const [pressed, setPressed] = useState(false);
    const resolvedStyle =
      typeof style === 'function' ? style({ pressed }) : style;
    const css = {
      ...rnStyleToCss(resolvedStyle, false),
      cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none',
      transition: 'all 130ms cubic-bezier(0.22, 1, 0.36, 1)',
    };
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onMouseDown={() => !disabled && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={(e) => {
          if (!disabled && onPress) onPress(e);
        }}
        style={css}
        {...rest}
      >
        {typeof children === 'function' ? children({ pressed }) : children}
      </div>
    );
  }
);

export const TextInput = forwardRef(
  (
    {
      style,
      value,
      onChangeText,
      onSubmitEditing,
      placeholder,
      placeholderTextColor = '#64748B',
      keyboardType = 'default',
      editable = true,
      autoFocus = false,
      ...rest
    },
    ref
  ) => {
    const css = {
      ...rnStyleToCss(style, true),
      outline: 'none',
      border: flattenStyle(style).borderWidth
        ? `${flattenStyle(style).borderWidth}px solid ${
            flattenStyle(style).borderColor || 'rgba(255,255,255,0.12)'
          }`
        : 'none',
      width: flattenStyle(style).width || '100%',
    };
    const inputType =
      keyboardType === 'numeric' || keyboardType === 'decimal-pad'
        ? 'number'
        : 'text';

    return (
      <input
        ref={ref}
        type={inputType}
        step={keyboardType === 'decimal-pad' ? '0.01' : 'any'}
        value={value ?? ''}
        disabled={!editable}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChangeText && onChangeText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmitEditing) {
            e.preventDefault();
            onSubmitEditing({ nativeEvent: { text: e.target.value } });
          }
        }}
        style={css}
        {...rest}
      />
    );
  }
);

export function Modal({
  visible = false,
  transparent = true,
  animationType = 'slide',
  onRequestClose,
  children,
}) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: transparent ? 'rgba(0,0,0,0.72)' : '#090A0F',
        backdropFilter: 'blur(8px)',
        animation: 'rnFadeIn 180ms ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onRequestClose) {
          onRequestClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation:
            animationType === 'slide'
              ? 'rnSlideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'rnFadeIn 180ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function StatusBar() {
  return null;
}

export const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios ?? obj.default ?? Object.values(obj)[0],
};

export const Dimensions = {
  get: () => ({
    width: Math.min(typeof window !== 'undefined' ? window.innerWidth : 393, 430),
    height: typeof window !== 'undefined' ? window.innerHeight : 852,
  }),
};

export const Vibration = {
  vibrate: (pattern = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  },
};

export const Easing = {
  linear: (t) => t,
  ease: (t) => t * (2 - t),
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  out: (fn) => (t) => 1 - fn(1 - t),
  inOut: (fn) => (t) =>
    t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2,
};

/**
 * React Native Animated Value & Interpolation Engine (60fps RAF)
 */
class AnimatedInterpolation {
  constructor(parent, config) {
    this._isAnimated = true;
    this.parent = parent;
    this.inputRange = config.inputRange || [0, 1];
    this.outputRange = config.outputRange || [0, 1];
  }

  getValue() {
    const val = this.parent.getValue();
    const [inMin, inMax] = this.inputRange;
    const [outMin, outMax] = this.outputRange;
    const ratio =
      inMax === inMin ? 0 : Math.min(1, Math.max(0, (val - inMin) / (inMax - inMin)));

    if (typeof outMin === 'string' && outMin.endsWith('deg')) {
      const startDeg = parseFloat(outMin);
      const endDeg = parseFloat(outMax);
      return `${startDeg + (endDeg - startDeg) * ratio}deg`;
    }
    if (typeof outMin === 'string' && outMin.endsWith('%')) {
      const startPct = parseFloat(outMin);
      const endPct = parseFloat(outMax);
      return `${startPct + (endPct - startPct) * ratio}%`;
    }
    return outMin + (outMax - outMin) * ratio;
  }

   subscribe(cb) {
    return this.parent.subscribe(cb);
  }
}

class AnimatedValue {
  constructor(initial = 0) {
    this._isAnimated = true;
    this._value = initial;
    this._listeners = new Set();
    this._raf = null;
  }

  getValue() {
    return this._value;
  }

  setValue(next) {
    this._stopAnimation();
    this._value = next;
    this._notify();
  }

  _notify() {
    this._listeners.forEach((cb) => cb(this._value));
  }

  subscribe(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _stopAnimation() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  interpolate(config) {
    return new AnimatedInterpolation(this, config);
  }
}

function createTimingAnimation(animVal, config) {
  const {
    toValue = 0,
    duration = 260,
    easing = Easing.out(Easing.cubic),
  } = config;

  let stopped = false;

  return {
    start: (callback) => {
      stopped = false;
      animVal._stopAnimation();
      const startVal = animVal.getValue();
      const startTime = performance.now();

      if (duration <= 0) {
        animVal._value = toValue;
        animVal._notify();
        if (callback) callback({ finished: true });
        return;
      }

      const step = (now) => {
        if (stopped) return;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easing ? easing(progress) : progress;
        animVal._value = startVal + (toValue - startVal) * eased;
        animVal._notify();

        if (progress < 1) {
          animVal._raf = requestAnimationFrame(step);
        } else {
          animVal._raf = null;
          if (callback) callback({ finished: true });
        }
      };

      animVal._raf = requestAnimationFrame(step);
    },
    stop: () => {
      stopped = true;
      animVal._stopAnimation();
    },
  };
}

function createSpringAnimation(animVal, config) {
  const { toValue = 0, duration = 320 } = config;
  return createTimingAnimation(animVal, {
    toValue,
    duration,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
}

function createSequenceAnimation(animations) {
  let stopped = false;
  let currentIdx = 0;

  return {
    start: (callback) => {
      stopped = false;
      currentIdx = 0;
      const runNext = () => {
        if (stopped) return;
        if (currentIdx >= animations.length) {
          if (callback) callback({ finished: true });
          return;
        }
        const current = animations[currentIdx++];
        current.start((res) => {
          if (res?.finished && !stopped) {
            runNext();
          }
        });
      };
      runNext();
    },
    stop: () => {
      stopped = true;
      animations.forEach((a) => a.stop && a.stop());
    },
  };
}

function createParallelAnimation(animations) {
  let stopped = false;
  return {
    start: (callback) => {
      stopped = false;
      let doneCount = 0;
      if (animations.length === 0) {
        if (callback) callback({ finished: true });
        return;
      }
      animations.forEach((anim) => {
        anim.start(() => {
          doneCount += 1;
          if (doneCount === animations.length && !stopped && callback) {
            callback({ finished: true });
          }
        });
      });
    },
    stop: () => {
      stopped = true;
      animations.forEach((a) => a.stop && a.stop());
    },
  };
}

function createLoopAnimation(animation) {
  let stopped = false;
  return {
    start: () => {
      stopped = false;
      const loopStep = () => {
        if (stopped) return;
        animation.start((res) => {
          if (res?.finished && !stopped) {
            loopStep();
          }
        });
      };
      loopStep();
    },
    stop: () => {
      stopped = true;
      if (animation.stop) animation.stop();
    },
  };
}

function collectAnimatedRefs(style) {
  const s = flattenStyle(style);
  const refs = [];
  Object.values(s).forEach((v) => {
    if (v && typeof v === 'object' && '_isAnimated' in v) {
      refs.push(v);
    } else if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item && typeof item === 'object') {
          Object.values(item).forEach((tv) => {
            if (tv && typeof tv === 'object' && '_isAnimated' in tv) {
              refs.push(tv);
            }
          });
        }
      });
    }
  });
  return refs;
}

const AnimatedView = forwardRef(({ style, children, ...rest }, ref) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const anims = collectAnimatedRefs(style);
    const unsubs = anims.map((a) => a.subscribe(() => setTick((t) => t + 1)));
    return () => unsubs.forEach((u) => u());
  }, [style]);

  return (
    <div ref={ref} style={rnStyleToCss(style, false)} {...rest}>
      {children}
    </div>
  );
});

const AnimatedText = forwardRef(({ style, children, ...rest }, ref) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const anims = collectAnimatedRefs(style);
    const unsubs = anims.map((a) => a.subscribe(() => setTick((t) => t + 1)));
    return () => unsubs.forEach((u) => u());
  }, [style]);

  return (
    <Text ref={ref} style={style} {...rest}>
      {children}
    </Text>
  );
});

export const Animated = {
  Value: AnimatedValue,
  timing: createTimingAnimation,
  spring: createSpringAnimation,
  sequence: createSequenceAnimation,
  parallel: createParallelAnimation,
  loop: createLoopAnimation,
  View: AnimatedView,
  Text: AnimatedText,
};
