import React from "react";
import PropTypes from "prop-types";
import lottie, {
	AnimationItem,
	AnimationConfig,
	AnimationConfigWithData,
	AnimationConfigWithPath,
	AnimationEventCallback,
	AnimationEventName,
} from "lottie-web";

type WithOptionalContainer<T extends { container: Element }> = Omit<
	T,
	"container"
> & { container?: Element };

interface PropsWithData extends WithOptionalContainer<AnimationConfigWithData> {
	animationType: "data";
}

interface PropsWithPath extends WithOptionalContainer<AnimationConfigWithPath> {
	animationType: "path";
}

export type PlayState = "playing" | "paused" | "stopped";
export type Direction = "forward" | "reverse";

type CallbackProp =
	| "onEnterFrame"
	| "onLoopComplete"
	| "onComplete"
	| "onSegmentStart"
	| "onDestroy"
	| "onConfigReady"
	| "onDataReady"
	| "onDomLoaded"
	| "onError";

const EVENT_LISTENERS: { [k in CallbackProp]: AnimationEventName } = {
	onEnterFrame: "enterFrame",
	onLoopComplete: "loopComplete",
	onComplete: "complete",
	onSegmentStart: "segmentStart",
	onDestroy: "destroy",
	onConfigReady: "config_ready",
	onDataReady: "data_ready",
	onDomLoaded: "DOMLoaded",
	onError: "error",
};

interface OwnProps {
	playState?: PlayState;
	direction?: Direction;
	speed?: number;

	onEnterFrame: AnimationEventCallback;
	onLoopComplete: AnimationEventCallback;
	onComplete: AnimationEventCallback;
	onSegmentStart: AnimationEventCallback;
	onDestroy: AnimationEventCallback;
	onConfigReady: AnimationEventCallback;
	onDataReady: AnimationEventCallback;
	onDomLoaded: AnimationEventCallback;
	onError: AnimationEventCallback;
}

type Props = (PropsWithData | PropsWithPath) & OwnProps;

interface State {
	previousProps: Props | undefined;

	playStateChanged: boolean;
	directionChanged: boolean;
	speedChanged: boolean;
	changedEventListeners: CallbackProp[];
}

export default class Lottie extends React.Component<Props, State> {
	public static getDerivedStateFromProps(props: Props, state: State): State {
		const newState: Partial<State> = {};

		if (state.previousProps) {
			if (props.playState !== state.previousProps.playState) {
				newState.playStateChanged = true;
			}

			if (props.direction !== state.previousProps.direction) {
				newState.directionChanged = true;
			}

			if (props.speed !== state.previousProps.speed) {
				newState.speedChanged = true;
			}

			const changedEventListeners = [];
			(Object.keys(EVENT_LISTENERS) as CallbackProp[]).forEach(
				(callbackProp) => {
					if (
						state.previousProps &&
						props[callbackProp] !== state.previousProps[callbackProp]
					) {
						changedEventListeners.push(callbackProp);
					}
				},
			);
		}

		return newState as State;
	}

	private static extractLottieConfig(
		props: Props,
	): {
		lottie: WithOptionalContainer<AnimationConfig>;
		own: OwnProps & { animationType: Props["animationType"] };
		div: Omit<Props, keyof OwnProps | keyof AnimationConfig | "animationType">;
	} {
		const {
			// lottie props
			container,
			renderer,
			loop,
			autoplay,
			name,
			rendererSettings,

			animationType,
			playState,
			direction,
			speed,
			onEnterFrame,
			onLoopComplete,
			onComplete,
			onSegmentStart,
			onDestroy,
			onConfigReady,
			onDataReady,
			onDomLoaded,
			onError,

			// div props
			...rest
		} = props;

		return {
			lottie: {
				container,
				renderer,
				loop,
				autoplay,
				name,
				rendererSettings,
			},
			own: {
				animationType,
				playState,
				direction,
				speed,
				onEnterFrame,
				onLoopComplete,
				onComplete,
				onSegmentStart,
				onDestroy,
				onConfigReady,
				onDataReady,
				onDomLoaded,
				onError,
			},
			div: rest,
		};
	}

	private animation: AnimationItem | null = null;

	private ref: React.RefObject<HTMLDivElement>;

	public static propTypes = {
		playState: PropTypes.oneOf(["playing", "paused", "stopped"]),
		direction: PropTypes.oneOf(["forward", "reverse"]),
		speed: PropTypes.number,

		onEnterFrame: PropTypes.func,
		onLoopComplete: PropTypes.func,
		onComplete: PropTypes.func,
		onSegmentStart: PropTypes.func,
		onDestroy: PropTypes.func,
		onConfigReady: PropTypes.func,
		onDataReady: PropTypes.func,
		onDomLoaded: PropTypes.func,
		onError: PropTypes.func,

		container: PropTypes.element,
		renderer: PropTypes.oneOf(["svg", "canvas", "html"]),
		loop: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
		autoplay: PropTypes.bool,
		name: PropTypes.string,
		rendererSettings: PropTypes.oneOfType([
			// SVGRendererConfig
			PropTypes.shape({
				imagePreserveAspectRatio: PropTypes.string,
				className: PropTypes.string,
				title: PropTypes.string,
				description: PropTypes.string,
				preserveAspectRatio: PropTypes.string,
				progressiveLoad: PropTypes.bool,
				hideOnTransparent: PropTypes.bool,
				viewBoxOnly: PropTypes.bool,
				viewBoxSize: PropTypes.string,
				focusable: PropTypes.bool,
			}),
			// CanvasRendererConfig
			PropTypes.shape({
				imagePreserveAspectRatio: PropTypes.string,
				className: PropTypes.string,
				clearCanvas: PropTypes.bool,
				context: PropTypes.instanceOf(CanvasRenderingContext2D),
				progressiveLoad: PropTypes.bool,
				preserveAspectRatio: PropTypes.string,
			}),
			// HTMLRendererConfig
			PropTypes.shape({
				imagePreserveAspectRatio: PropTypes.string,
				className: PropTypes.string,
				hideOnTransparent: PropTypes.bool,
			}),
		]),
	};

	public static defaultProps: Partial<Props> = {
		container: undefined,
		loop: false,
		autoplay: true,
		name: undefined,
		renderer: "svg",
		rendererSettings: {},

		playState: "playing",
		direction: "forward",
		speed: 1,

		onEnterFrame: () => {},
		onLoopComplete: () => {},
		onComplete: () => {},
		onSegmentStart: () => {},
		onDestroy: () => {},
		onConfigReady: () => {},
		onDataReady: () => {},
		onDomLoaded: () => {},
		onError: () => {},
	};

	public constructor(props: Props) {
		super(props);

		this.state = {
			previousProps: undefined,
			playStateChanged: true,
			directionChanged: true,
			speedChanged: true,
			changedEventListeners: Object.keys(EVENT_LISTENERS) as CallbackProp[],
		};

		this.ref = React.createRef();
	}

	public componentDidMount(): void {
		let commonConfig: AnimationConfig;
		const { lottie: withOptionalContainer } = Lottie.extractLottieConfig(
			this.props,
		);

		const { container, ...rest } = withOptionalContainer;
		if (!container && this.ref.current) {
			commonConfig = { ...rest, container: this.ref.current };
		} else if (container) {
			commonConfig = withOptionalContainer as AnimationConfig;
		} else {
			throw new Error("Lottie mounted without container or ref");
		}

		let config: AnimationConfigWithPath | AnimationConfigWithData;
		// eslint-disable-next-line react/destructuring-assignment
		if (this.props.animationType === "data") {
			const { animationData } = this.props;
			config = { ...commonConfig, animationData };
			// eslint-disable-next-line react/destructuring-assignment
		} else if (this.props.animationType === "path") {
			const { path } = this.props;
			config = { ...commonConfig, path };
		} else {
			const { animationType } = this.props;
			throw new Error(`Unexpected animationType ${animationType}`);
		}

		// Mutate state without triggering rerender
		// This means we can access previousConfig from getDerivedStateFromProps
		this.state = { ...this.state, previousProps: this.props };
		this.animation = lottie.loadAnimation(config);
	}

	public componentWillUnmound(): void {
		if (this.animation) {
			this.animation.destroy();
		}
	}

	public render(): React.ReactNode {
		const { div: rest, own } = Lottie.extractLottieConfig(this.props);
		const {
			playStateChanged,
			directionChanged,
			speedChanged,
			changedEventListeners,
			previousProps,
		} = this.state;

		let newState: Partial<State> | null = null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		function updateState(key: keyof State, value: any): void {
			if (!newState) {
				newState = {};
			}
			newState[key] = value;
		}

		if (this.animation) {
			if (playStateChanged) {
				switch (own.playState) {
					case "playing":
						this.animation.play();
						break;
					case "paused":
						this.animation.pause();
						break;
					case "stopped":
						this.animation.stop();
						break;
					default:
						break;
				}

				updateState("playStateChanged", false);
			}

			if (directionChanged) {
				if (own.direction === "forward") {
					this.animation.setDirection(1);
				} else if (own.direction === "reverse") {
					this.animation.setDirection(-1);
				}

				updateState("directionChanged", false);
			}

			if (speedChanged && own.speed) {
				this.animation.setSpeed(own.speed);

				updateState("speedChanged", false);
			}

			if (changedEventListeners.length) {
				changedEventListeners.forEach((eventName) => {
					if (!this.animation) {
						return;
					}
					if (previousProps) {
						this.animation.removeEventListener(
							EVENT_LISTENERS[eventName],
							previousProps[eventName],
						);
					}
					const { [eventName]: listener } = this.props;
					this.animation.addEventListener(EVENT_LISTENERS[eventName], listener);
				});

				updateState("changedEventListeners", []);
			}
		} else {
			setTimeout(() => this.forceUpdate(), 0);
		}

		if (newState) {
			setTimeout(() => this.setState(newState as State), 0);
		}

		return <div ref={this.ref} {...rest} />;
	}
}
