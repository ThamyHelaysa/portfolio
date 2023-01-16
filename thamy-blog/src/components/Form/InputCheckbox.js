import * as React from 'react';
import styled from "styled-components";


const Container = styled.div`
    display: flex;
    height: 40px;
    margin-right: 1rem;
`

const Input = styled.input`
    width: 0;
    height: 0;
    appearance: none;
    &:checked + label {
        background-color: ${(props) => props.theme.colors.extra};
    }
`

const Label = styled.label`
    display: block;
    width: 40px;
    height: 40px;
    background-color: ${(props) => props.theme.colors.bodyColor};
    border: ${(props) => props.theme.colors.border};
    cursor: pointer;
`

const InputCheckbox = ({ onCheck, checkValue, checkID }) => {

    const checkToDo = React.useCallback((e) => {
        onCheck(e);
    }, [onCheck]);

    return (
        <Container>
            <Input
                id={`checked_${checkID}`}
                defaultChecked={checkValue ? "checked" : undefined}
                onChange={checkToDo}
                type="checkbox"/>
            <Label htmlFor={`checked_${checkID}`}></Label>
        </Container>
    )
}


export default InputCheckbox;
