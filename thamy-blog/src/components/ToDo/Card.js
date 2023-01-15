import * as React from 'react';
import styled from 'styled-components';

import Button from '../Button/DefaultButton';
import InputCheckbox from '../Form/InputCheckbox';

import BREAKPOINTS from '../../constants/breakpoints';

const Item = styled.li`
    display: flex;
    align-items: center;
    padding: 1rem;
    background-color: ${(props) => props.theme.colors.bgColor};
    border: 2px solid ${(props) => props.theme.colors.terceary};
    & > span {
        word-wrap: break-word;
        @media (max-width: ${BREAKPOINTS.mobile}){
            max-width: 70%;
            padding-right: 10px;
        }
    }
`

const ItemLabel = styled.span`
    .--checked > & {
        text-decoration: line-through;
    }
`

const RemoveButton = styled(Button)`
    width: auto;
    margin-left: auto;
    & > i {
        font-style: normal;
    }
    @media (max-width: ${BREAKPOINTS.tablet}){
        padding-left: .5rem;
        padding-right: .5rem;
        & > span {
            display: none;
        }
        & > i {
            display: block;
        }
    }
`

const Card = ({ toDoItem, toDoIndex, onRemove, onDoneToDo, doneValue }) => {

    const removeToDo = React.useCallback(() => {
        onRemove(toDoIndex);
    }, [onRemove,toDoIndex]);

    const checkDone = React.useCallback((e) => {
        onDoneToDo(toDoIndex,e);
    }, [onDoneToDo, toDoIndex]);

    return (
        <Item className={doneValue ? "--checked" : ""}>
            <InputCheckbox
                checkID={toDoIndex}
                checkValue={doneValue}
                onCheck={checkDone}></InputCheckbox>
            <ItemLabel>{toDoItem}</ItemLabel>
            <RemoveButton onClick={removeToDo}>
                <span>Remove</span>
                <i>&#x274C;</i>
            </RemoveButton>
        </Item>
    )
}

export default Card;
