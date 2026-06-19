import { InjectionToken, ModuleWithProviders, NgModule } from "@angular/core";
import { Action, ActionReducer, ActionReducerMap, FeatureSlice, RootStoreConfig, StoreConfig, StoreFeatureModule, StoreModule, StoreRootModule } from "@ngrx/store";

@NgModule({})
export class ProteoStoreModule {

	static names: string[]

	static forRoot<T, V extends Action = Action>(
    reducers?: ActionReducerMap<T, V> | InjectionToken<ActionReducerMap<T, V>>,
    config?: RootStoreConfig<T, V>
  ): ModuleWithProviders<StoreRootModule> | never {
	const names = ProteoStoreModule.names ?? [];
	const NOT_FOUND = -1;
	const keys = Object.keys(reducers as object)
	const index = keys.findIndex(value => names.includes(value))
	const key = keys.find((value, idx) => idx === index)
	if(index  !== NOT_FOUND) {
		throw new Error (`[ProteoStoreModule] The identifier ${key} in forRoot is already taken `)
	}
	names.push(key!)

	ProteoStoreModule.names = names

    return StoreModule.forRoot(reducers, config);
  }

   static forFeature<T, V extends Action = Action>(
    featureName: string,
    reducers: ActionReducerMap<T, V> | InjectionToken<ActionReducerMap<T, V>>,
    config?: StoreConfig<T, V> | InjectionToken<StoreConfig<T, V>>
  ): ModuleWithProviders<StoreFeatureModule>;
  static forFeature<T, V extends Action = Action>(
    featureName: string,
    reducer: ActionReducer<T, V> | InjectionToken<ActionReducer<T, V>>,
    config?: StoreConfig<T, V> | InjectionToken<StoreConfig<T, V>>
  ): ModuleWithProviders<StoreFeatureModule>;
  static forFeature<T, V extends Action = Action>(
    slice: FeatureSlice<T, V>
  ): ModuleWithProviders<StoreFeatureModule>;

 static forFeature<T, V extends Action = Action>(
    featureNameOrSlice: string | FeatureSlice<T, V>,
    reducers?:
      | ActionReducerMap<T, V>
      | InjectionToken<ActionReducerMap<T, V>>
      | ActionReducer<T, V>
      | InjectionToken<ActionReducer<T, V>>,
    config: StoreConfig<T, V> | InjectionToken<StoreConfig<T, V>> = {}
  ): ModuleWithProviders<StoreFeatureModule> | never {
	const names = ProteoStoreModule.names ?? [];


	if(typeof featureNameOrSlice === 'string' && names.includes(featureNameOrSlice)) {
		throw new Error (`[ProteoStoreModule] The identifier ${featureNameOrSlice} in forFeature is already taken `)
	}
	if(typeof featureNameOrSlice === 'string') names.push(featureNameOrSlice)

	ProteoStoreModule.names = names

	if (typeof featureNameOrSlice === 'string' && typeof reducers === 'object' ) return StoreModule.forFeature(featureNameOrSlice, reducers, config)
	if (typeof featureNameOrSlice === 'string' && typeof reducers === 'function' ) return StoreModule.forFeature(featureNameOrSlice, reducers, config)
    if (typeof featureNameOrSlice === 'function') return StoreModule.forFeature(featureNameOrSlice)
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore all cases were checked before, next line it's just default behavior
	return StoreModule.forFeature(featureNameOrSlice, reducers, config)
  }
}
