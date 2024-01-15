import React, { useCallback, useEffect, useMemo, useState } from "react";
import cx from "classnames";

import { PokemonItem, IPokemonItem } from "./PokemonItem";

import "./styles.scss";

interface IPokemonResponse {
  count: number;
  results: IPokemonItem[];
}

interface IPokemonByType {
  pokemon: {
    name: string;
    url: string;
  };
}

interface IPokemonType {
  name: string;
  url: string;
  pokemon: IPokemonByType[];
}

const BASE_URL = "https://pokeapi.co/api/v2";
const ITEM_PER_PAGE = 48;

// convert key follow sequence
const convertKeyType = (list: string[], selectedKey: string) => {
  const keys = selectedKey.split("-");
  const arr = [];
  for (let i = 0; i < list.length; i++) {
    if (keys.includes(list[i])) {
      arr.push(list[i]);
    }
  }
  return arr.join("-");
};

const findCommonPokemon = (arrays: IPokemonByType[][]): string[] => {
  if (arrays.length === 0) return [];
  return arrays
    .reduce((commonItems, currentArray) => {
      return commonItems.filter((item) =>
        currentArray.some(
          (curItem) => curItem.pokemon.name === item.pokemon.name
        )
      );
    })
    .map((item) => item.pokemon.url);
};

export const Pokemons: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [pokemonTypes, setPokemonTypes] = useState<IPokemonType[]>([]);
  const [pokemons, setPokemons] = useState<IPokemonItem[]>([]);
  const [page, setPage] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<IPokemonType[]>([]);
  const [fetchUrls, setFetchUrls] = useState<string[]>([]);
  const [hasFetchedPokemonTypes, setHasFetchedPokemonTypes] = useState(false);
  const [pokemonsByPage, setPokemonsByPage] = useState<{
    [page: number | string]: IPokemonItem[];
  }>({});
  const [pokemonsByType, setPokemonsByType] = useState<{
    [type: string]: {
      [page: number]: IPokemonItem[];
    };
  }>({});
  const [fetchUrlsByType, setFetchUrlsByType] = useState<{
    [type: string]: string[];
  }>({});

  const getPokemonTypes = useCallback(async () => {
    const response = await fetch(`${BASE_URL}/type`);
    const data = await response.json();

    const listPokemonsByType: IPokemonType[] = await Promise.all(
      data.results.map(async (item: IPokemonType) => {
        const response = await fetch(item.url);
        const pokemons = await response.json();
        return {
          name: item.name,
          url: item.url,
          pokemon: pokemons.pokemon,
          length: pokemons.pokemon.length,
        };
      })
    );
    setPokemonTypes(listPokemonsByType);
  }, []);

  const pokemonTypeNames = useMemo(
    () => pokemonTypes.map((type) => type.name),
    [pokemonTypes]
  );

  const fetchAndSetPokemonsByType = useCallback(
    async (typeNameKey: string, urls: string[]) => {
      const urlsPagination = [...urls].slice(
        page * ITEM_PER_PAGE,
        (page + 1) * ITEM_PER_PAGE
      );
      const poks = await Promise.all(
        urlsPagination.map(async (url) => {
          const response = await fetch(url);
          return response.json();
        })
      );
      const mapPoks = poks.map((item) => ({
        name: item.name,
        url: item?.sprites.other["official-artwork"].front_default,
        types: item.types,
      }));
      console.log("mapPoks", mapPoks);
      setPokemonsByType((prev) => ({
        ...prev,
        [typeNameKey]: {
          [page]: mapPoks,
        },
      }));
      setPokemons(mapPoks);
    },
    [page]
  );

  const fetchPokemonsWithUrls = useCallback(async () => {
    if (fetchUrls.length === 0) return;

    let pokemonsToSet: IPokemonItem[] = [];
    const typeNameKey = selectedTypes.map((t) => t.name).join("-");
    const convertedNameKey = convertKeyType(pokemonTypeNames, typeNameKey);

    if (convertedNameKey && pokemonsByType[convertedNameKey]?.[page]) {
      // Use cached data if a type is selected
      pokemonsToSet = pokemonsByType[convertedNameKey][page];
    } else if (convertedNameKey && !pokemonsByType[convertedNameKey]?.[page]) {
      fetchAndSetPokemonsByType(convertedNameKey, fetchUrls);
    } else if (!pokemonsByPage[page]) {
      // Fetch and cache pokemons for new page
      const urls = fetchUrls.slice(
        page * ITEM_PER_PAGE,
        (page + 1) * ITEM_PER_PAGE
      );
      const poks = await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          return response.json();
        })
      );
      const mapPoks = poks.map((item) => ({
        name: item.name,
        url: item?.sprites.other["official-artwork"].front_default,
        types: item.types,
      }));
      setPokemonsByPage((prev) => ({ ...prev, [page]: mapPoks }));
      pokemonsToSet = mapPoks;
    } else {
      console.log("iiii");
      // Use cached data for the current page
      pokemonsToSet = pokemonsByPage[page];
    }

    setCount(fetchUrls.length);
    setPokemons(pokemonsToSet);
  }, [
    page,
    pokemonTypeNames,
    fetchUrls,
    pokemonsByPage,
    pokemonsByType,
    selectedTypes,
    fetchAndSetPokemonsByType,
  ]);

  const getPokemons = useCallback(async () => {
    const response = await fetch(`${BASE_URL}/pokemon?limit=1200`);
    const data: IPokemonResponse = await response.json();
    setCount(data.count);
    const listPokemonsApiEndpoint = data.results.map((item) => item.url);
    setFetchUrls(listPokemonsApiEndpoint);
  }, []);

  const onSelectType = useCallback(
    async (typeName: string) => {
      const isTypeSelected = selectedTypes.some(
        (type) => type.name === typeName
      );
      let updatedSelectedTypes = [];

      if (isTypeSelected) {
        updatedSelectedTypes = selectedTypes.filter(
          (type) => type.name !== typeName
        );
      } else {
        updatedSelectedTypes = [
          ...selectedTypes,
          pokemonTypes.find((type) => type.name === typeName)!,
        ];
      }

      setSelectedTypes(updatedSelectedTypes);
      setPage(0);

      if (updatedSelectedTypes.length === 0) {
        // Fetch default data if no type is selected
        fetchPokemonsWithUrls();
      } else {
        const typeNameKey = updatedSelectedTypes.map((t) => t.name).join("-");
        const convertedNameKey = convertKeyType(pokemonTypeNames, typeNameKey);
        if (fetchUrlsByType[convertedNameKey]) {
          // Use cached data if available
          setFetchUrls(fetchUrlsByType[convertedNameKey]);
          setPokemons(pokemonsByType[convertedNameKey][page] || []);
        } else {
          // Fetch and cache data for new type
          const filteredUrls = findCommonPokemon(
            updatedSelectedTypes.map((type) => type.pokemon)
          );

          console.log("filteredUrls", filteredUrls);

          setFetchUrls(filteredUrls);
          setFetchUrlsByType((prev) => ({
            ...prev,
            [convertedNameKey]: filteredUrls,
          }));
          // Fetch and cache pokemons for new type
          fetchAndSetPokemonsByType(convertedNameKey, filteredUrls);
        }
      }
    },
    [
      page,
      pokemonTypeNames,
      selectedTypes,
      pokemonTypes,
      fetchPokemonsWithUrls,
      fetchUrlsByType,
      pokemonsByType,
      fetchAndSetPokemonsByType,
    ]
  );

  useEffect(() => {
    if (!hasFetchedPokemonTypes) {
      getPokemonTypes();
      setHasFetchedPokemonTypes(true);
    }
  }, [getPokemonTypes, hasFetchedPokemonTypes]);

  useEffect(() => {
    if (selectedTypes.length === 0) {
      getPokemons();
    }
  }, [getPokemons, selectedTypes]);

  useEffect(() => {
    fetchPokemonsWithUrls();
  }, [fetchPokemonsWithUrls]);

  const onGoToNextPage = useCallback(() => {
    setPage((prevPage) => prevPage + 1);
  }, []);

  const onBackToPreviousPage = useCallback(() => {
    setPage((prevPage) => prevPage - 1);
  }, []);

  const lastPage = useMemo(() => Math.ceil(count / ITEM_PER_PAGE), [count]);

  const renderNoData = useCallback(() => {
    return <div className="no-data">No results found.</div>;
  }, []);

  return (
    <div className="pokemons-container">
      <div className="list-pokemon-type">
        <h3>Types</h3>
        <div className="types-list">
          {pokemonTypeNames.map((name) => (
            <button
              onClick={() => onSelectType(name)}
              className={cx({
                selected: selectedTypes.map((type) => type.name).includes(name),
              })}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {pokemons.length > 0 ? (
        <>
          <h2 className="count-results">{count} results found.</h2>
          <div className="list-pokemon">
            {pokemons.map((pokemon) => (
              <PokemonItem key={pokemon.name} {...pokemon} />
            ))}
          </div>
        </>
      ) : (
        renderNoData()
      )}
      <div className="button-groups">
        <button
          className="btn"
          onClick={onBackToPreviousPage}
          disabled={page === 0}
        >
          Prev
        </button>
        <button
          className="btn"
          onClick={onGoToNextPage}
          disabled={page + 1 === lastPage}
        >
          Next
        </button>
      </div>
    </div>
  );
};
