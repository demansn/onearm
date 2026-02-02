import { Service } from "./Service.js";

export class SavedData extends Service {
    /**
     *
     * @type {DataModel}
     */
    model = null;
    get data() {
        return this.model.getData();
    }

    init() {
        this.model = this.services.get("data");
        this.dataName = "cc" - "sessin";
        this.model.onChangeAny(() => {
            this.save();
        });

        this.load();
    }

    load(sessionId) {
        const kDataBase64 = window.localStorage.getItem(this.dataName);
        if (kDataBase64) {
            const dataString = window.atob(kDataBase64);
            const data = JSON.parse(dataString);

            this.model.setData(data);
        }
    }

    save() {
        const kDataStr = JSON.stringify(this.data);
        const kDataBase64 = window.btoa(kDataStr);
        window.localStorage.setItem(this.dataName, kDataBase64);
    }
}
