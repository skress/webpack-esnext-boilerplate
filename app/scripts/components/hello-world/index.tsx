import { FunctionalComponent, h } from "preact";

import "./style.css";

interface Props {
    color: string;
}

const App: FunctionalComponent<Props> = (props: Props) => {
    return (
        <div>
            <h1 style={{ color: props.color }}>Hello!!, World!</h1>
        </div>
    );
}

export default App;
