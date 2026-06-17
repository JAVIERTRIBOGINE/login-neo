import { of } from "rxjs";

export const mockActivatedRoute = {
    snapshot: {
      /*  paramMap: {
            get: () => 'mockValue'
        }*/
    },
    params: of({}),
    queryParams: of({}),
    data: of({}),
    url: of([]),
};
