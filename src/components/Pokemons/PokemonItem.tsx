import React from 'react';

import "./styles.scss";

export interface IPokemonItem {
    name: string;
    url: string;
    types: any[]
}


export const PokemonItem: React.FC<IPokemonItem> = ({
    name,
    url
}) => {
    return (
        <div>
            <div className='pokemon-item'>
                <img src={url} alt={name} width={100} height={100} loading='lazy' />
            </div>
            <div className='pokemon-name'>
                {name}
            </div>
        </div>
    )
}
