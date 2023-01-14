import * as React from 'react';


const App = () => {

    const toDoList = JSON.parse(localStorage.getItem("toDoList")) || []

    const [toDo, setToDo] = React.useState(toDoList);
    const [inputText, setInputText] = React.useState("");

    const getText = React.useCallback((e) => {
        setInputText(e.target.value);
        console.log("evento", e.target.value);
    }, [])

    const addToDo = React.useCallback((e) => {
        e.preventDefault();

        let newToDo = [...toDo];
        newToDo.push({ item: inputText, id: newToDo.length });
        setToDo(newToDo);
        localStorage.setItem("toDoList",JSON.stringify(newToDo));
        setInputText("");
    }, [inputText, toDo])

    return (
        <div>
            <form onSubmit={addToDo}>
                <input
                    required
                    value={inputText}
                    onChange={getText}
                    type="text"
                    placeholder='I need to do...' />
                    
                <button type='submit'>Add ToDo</button>
            </form>
            <div>
                <ul>
                    {toDo.map(({ item, id }) => (
                        <li key={`item_${id}`}>{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    )
}


export default App;
