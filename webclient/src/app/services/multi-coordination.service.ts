import {EventEmitter, Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';
import {Observable} from "rxjs/Observable";
import {Observer} from "rxjs/Observer";
import {Indicator} from "../model/indicator";


@Injectable()
export class MultiCoordinationService {


    indicators: any[] = [];

    //used to communicate that an indicator has to be added to the CI
    private displayIndicatorObserver: Observer<Indicator>;

    //used to communicate that the time period of the CI has to be changed
    //due to a time period change in the indicator component
    private changeTimePeriodObserver: Observer<any[]>;

    //used to inform CI component that a indicator was reversed and that the CI has to be updated
    private reverseIndicatorObserver: Observer<Indicator>;

    //Used to communicate between indicator components that the selection (size) of the navChart changed
    private changeSelectionObserver: Observer<any[]>;

    //used to emit an event whenever a component is destroyed, so that other components can react accordingly.
    //the string represents the name of the component
    private componentDestroyObserver: Observer<string>;

    //used to emit event to CI and indicators component whenever the time period of the target market chart changes
    private updateIndexLineObserver: Observer<any>;

    private displayIndicatorEventObservable: Observable<Indicator>;
    private changeTimePeriodObservable: Observable<any[]>;
    private reverseIndicatorObservable: Observable<Indicator>;
    private changeSelectionObservable: Observable<any[]>;
    private componentDestroyObservable: Observable<string>;
    private updateIndexLineObservable: Observable<any>;

    constructor(private http: Http) {
        this.displayIndicatorEventObservable = new Observable<Indicator>(observer =>
            this.displayIndicatorObserver = observer).share();
        this.changeTimePeriodObservable = new Observable<any[]>(observer =>
            this.changeTimePeriodObserver = observer).share();
        this.reverseIndicatorObservable = new Observable<Indicator>(observer => this.reverseIndicatorObserver = observer).share();
        this.changeSelectionObservable = new Observable<any[]>(observer => this.changeSelectionObserver = observer).share();
        this.componentDestroyObservable = new Observable<string>(observer => this.componentDestroyObserver = observer).share();
        this.updateIndexLineObservable = new Observable<any>(observer =>
            this.updateIndexLineObserver = observer).share();
    }

    getDisplayIndicatorEmitter(): Observable<Indicator> {
        return this.displayIndicatorEventObservable;
    }

    emitShowIndicator(data: any): void {
        this.displayIndicatorObserver.next(data);
    }

    getChangeTimePeriodEmitter(): Observable<any[]> {
        return this.changeTimePeriodObservable;
    }
    emitChangeTimePeriods(data: any[]) {
        this.changeTimePeriodObserver.next(data);
    }

    getReverseIndicatorObservable(): Observable<Indicator>{
        return this.reverseIndicatorObservable;
    }

    getChangeSelectionObservable(): Observable<any[]>{
        return this.changeSelectionObservable;
    }


    reverseIndicator(indicator: Indicator) {
        let indicatorIndex: number = this.indicators.findIndex(elem => elem.name == indicator.name);
        this.indicators[indicatorIndex] = indicator;
        this.reverseIndicatorObserver.next(indicator);
    }

    emitChangeSelection(selectionSizeAndSource: any[]){
        this.changeSelectionObserver.next(selectionSizeAndSource);
    }

    getComponentDestroyObservable(): Observable<string>{
        return this.componentDestroyObservable;
    }
    emitComponentDestroy(comp: string){
        this.componentDestroyObserver.next(comp);
    }

    getUpdateIndexLineObservable(): Observable<any>{
        return this.updateIndexLineObservable;
    }
    emitUpdateIndexLine(domain: any) {
        this.updateIndexLineObserver.next(domain);
    }

    setIndicators(values: any[]) {
        this.indicators = values;
    }

    getIndicators(): any[] {
        return this.indicators;
    }


}