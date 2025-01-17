"use client";
import { useState, useEffect, use } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  getLocalStorage,
  setLocalStorage,
} from "@/components/app/tienda/utils/handleLocalStorage";

const Cart = () => {
  const [products, setProducts] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});
  const [cartIsEmpty, setCartIsEmpty] = useState(false);
  const url = "https://cakeback.somee.com";
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        /* const response = await axios.get( "/products.json"
          `${url}/api/v1/shopping-carts`
        );https://s4kn44kn-9080.brs.devtunnels.ms/api/v1/shopping-carts
        const data = response.data; */

        //Leo: Agregue la logica para obtener los productos del carrito desde el localStorage
        const data = getLocalStorage("cart") || [];
        setProducts(data);

        const initialQuantities = {};
        data.forEach((product) => {
          initialQuantities[product.productId] = product.count || 0;
        });
        setProductQuantities(initialQuantities);
      } catch (error) {
        console.error("Error al cargar los productos", error);
      }
    };

    fetchProducts();
  }, []);

  //Leo: Actualizo el localStorage cada vez que se actualiza el carrito
  useEffect(() => {
    setLocalStorage("cart", products);
  }, [products]);

  const updateBackend = async (productId, quantity) => {
    try {
      console.log(
        "Updating backend with productId:",
        productId,
        "quantity:",
        quantity
      );
      await axios.patch(
        `${url}/api/v1/shopping-carts/update-product`, //updateProduct
        {
          id: productId,
          count: quantity,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error al actualizar el carrito en el backend", error);
    }
  };

  const handleIncrementQuantity = (productId) => {
    setProductQuantities((prevQuantities) => {
      const updatedQuantities = {
        ...prevQuantities,
        [productId]: prevQuantities[productId] + 1,
      };
      updateBackend(productId, updatedQuantities[productId]);
      return updatedQuantities;
    });

    //Leo: Actualizo el producto con la nueva cantidad
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.productId === productId
          ? { ...product, count: product.count + 1 }
          : product
      )
    );
  };

  const handleDecrementQuantity = (productId) => {
    setProductQuantities((prevQuantities) => {
      const updatedQuantities = {
        ...prevQuantities,
        [productId]:
          prevQuantities[productId] > 0 ? prevQuantities[productId] - 1 : 0,
      };
      updateBackend(productId, updatedQuantities[productId]);
      return updatedQuantities;
    });

    //Leo: Actualizo el producto con la nueva cantidad
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.productId === productId
          ? { ...product, count: product.count - 1 }
          : product
      )
    );
  };

  const clearBackend = async (productId) => {
    try {
      console.log("Deleted backend:");
      await axios.post(
        `${url}/api/v1/shopping-carts/to-empty`, //cartEmpty
        {
          productId: productId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error al eliminar el producto en el backend", error);
      throw error; // Re-lanza el error para que pueda ser manejado en handleClearCart
    }
  };

  const handleClearCart = async () => {
    setProductQuantities({});
    setProducts([]);
    setCartIsEmpty();

    //Leo:vaciar el carrito en el localStorage
    setLocalStorage("cart", []);

    try {
      // Vaciar el carrito en el backend
      await clearBackend();

      // Notificar al backend que el carrito ha sido vaciado
      await Promise.all(
        products.map((product) => clearBackend(product.productId))
      );
    } catch (error) {
      console.error("Error al vaciar el carrito en el backend", error);
    }
  };

  const removeProduct = async (productId) => {
    try {
      console.log("Product removed:", productId);
      await axios.delete(
        `${url}/api/v1/shopping-carts/delete-product/${productId}`, //removeProduct
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error al remover el producto", error);
    }
  };

  const handleRemoveProduct = (productId) => {
    const updatedQuantities = { ...productQuantities };
    delete updatedQuantities[productId];
    setProductQuantities(updatedQuantities);

    const updatedProducts = products.filter(
      (product) => product.productId !== productId
    );
    setProducts(updatedProducts);
    removeProduct(productId);
  };

  const totalCartPrice = Object.keys(productQuantities).reduce(
    (total, productId) => {
      const product = products.find(
        (product) => product.productId === parseInt(productId)
      );
      return (
        total + (parseInt(product?.price) || 0) * productQuantities[productId]
      );
    },
    0
  );

  const handleCheckout = async () => {
    const order = {
      ordersDetails: products.map((product) => ({
        id: product.productId,
        count: productQuantities[product.productId],
      })),
    };

    console.log("Order to be sent:", JSON.stringify(order, null, 2));

    try {
      const response = await axios.post(
        `${url}/api/v1/orders`, //Orders
        order,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Orden creada exitosamente:", response.data);
      toast.success(" Procediendo al checkout.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error al crear la orden:", error);
      toast.error(
        "Hubo un error al procesar tu pedido. Por favor, intenta nuevamente.",
        {
          position: "top-center",
        }
      );
    }

    router.push("/cart/form");
  };

  //redirige a la pagina donde pida los datos o de MP

  if (!products || products.length === 0) {
    return (
      <div className=" text-center text-gray-500 bg-white rounded-lg min-h-screen w-full flex flex-col justify-center items-center gap-10">
        <h1 className="text-xl">No hay productos en el carrito</h1>
        <h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="icon icon-tabler icon-tabler-shopping-cart-exclamation"
            width="60"
            height="60"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
            <path d="M15 17h-9v-14h-2" />
            <path d="M6 5l14 1l-.854 5.976m-2.646 1.024h-10.5" />
            <path d="M19 16v3" />
            <path d="M19 22v.01" />
          </svg>
        </h3>

        <Link href="/tienda" passHref>
          <button className="mt-10 bg-pink-400 h-12 w-36 rounded-lg text-white">
            Ir a la tienda
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className=" min-h-screen">
       <h3 className=" flex justify-center items-start bg-purple-300 text-white  text-xl font-semibold md:text-2xl lg:text-3xl pt-5 pb-5 ">
        Your Cart:{" "}
      </h3>
      <ul className="min-h-screen   sm:ml-0 sm:mr-0 mb-5 sm:pl-0 sm:pr-0 bg-white rounded-xl  sm:grid sm:grid-cols-1 p-5 lg:p-10">
        {products.map((product) => (
          <li
            key={product.productId}
            className=" gap-2 w-full items-center bg-white sm:h-64 content-between border-b  sm:grid sm:grid-cols-4 sm:grid-rows-5 md:auto-rows-auto  sm:justify-items-center md:justify-between lg:justify-around md:grid-cols-5 md:grid-rows-3 md:h-auto  md:items-center md:content-center lg:grid lg:grid-cols-5 lg:items-center  "
          >
            <img
              src={product.image}
              alt={product.productName}
              className="sm:text-xs md:text-md sm:w-12 sm:h-12 sm:col-start-1 sm:row-start-3 sm:row-end-5 md:col-start-1 md:row-start-3 lg:w-20 lg:h-20 lg:row-start-3"
            />
            <div className="sm:row-start-1 sm:col-start-1">
              <p className="sm:text-xs md:text-md  font-bold text-pink-500 lg:text-lg">
                Producto:
              </p>
            </div>
            <div className="name/price sm:col-start-1 sm:row-start-2 md:col-start-1 md:row-start-2">
              <h4 className=" sm:text-xs md:text-md text-base text-start pb-1 font-bold text-pink-400 lg:text-lg">
                {product.productName}
              </h4>
            </div>
            <div className="sm:row-start-2 sm:col-start-2 md:col-start-2 md:row-start-2">
              <p className="sm:text-xs  md:text-md font-semibold pt-2 pb-1 text-pink-300 lg:text-lg">
                ${parseInt(product.price)}
              </p>
            </div>

            <div className="sm:col-start-2 sm:row-start-1 text-md font-bold text-pink-500 md:pt-0 md:row-start-1 md:col-start-2 lg:text-lg">
              <p className="sm:text-xs md:text-md lg:text-lg">Precio:</p>
            </div>

            <div className="total sm:col-start-1 sm:row-start-5 md:col-start-4 md:row-start-1 justify-center">
              <p className="sm:text-xs md:text-md font-bold text-pink-500 sm:text-left lg:text-lg">
                Subtotal:
              </p>
            </div>

            <div className="sm:col-start-2 sm:row-start-5 md:col-start-4 md:row-start-2">
              <p className="sm:text-xs md:text-md font-bold text-pink-500 sm:text-center sm:justify-center lg:text-lg">
                $
                {parseInt(product.price) * productQuantities[product.productId]}
              </p>
            </div>

            <button
              className="items-center sm:flex sm:justify-center sm:content-center sm:w-8 sm:h-8 font-medium rounded-md text-pink-400 bg-pink-200 transition-all duration-500 ease-in-out hover:text-pink-700 hover:bg-pink-300 sm:row-start-2 sm:col-start-4 md:w-10 md:h-10 md:col-start-5 md:row-start-1"
              onClick={() => handleIncrementQuantity(product.productId)}
            >
              +
            </button>

            <div className="sm:row-start-1 sm:col-start-3 md:col-start-3 md:row-start-1">
              <p className="sm:text-xs md:text-md font-bold text-pink-500 sm:text-center lg:text-lg">
                Unidades:
              </p>
            </div>

            <span className="sm:text-xs text-md font-medium text-gray-400 md:text-md sm:col-start-3 sm:row-start-2 sm:text-center md:col-start-3 md:row-start-2 lg:text-lg">
              {productQuantities[product.productId]}
            </span>

            {productQuantities[product.productId] > 1 && (
              <button
                className="sm:w-8 sm:h-8 font-medium rounded-md text-pink-400 bg-pink-200 transition-all duration-500 ease-in-out hover:text-pink-700 hover:bg-pink-300 sm:col-start-4 sm:row-start-3 md:w-10 md:h-10 md:col-start-5 md:row-start-2"
                onClick={() => handleDecrementQuantity(product.productId)}
              >
                -
              </button>
            )}

            <button
              className="sm:w-8 sm:h-8 font-medium rounded-md bg-pink-600 text-white transition-all duration-500 ease-in-out hover:bg-white hover:text-pink-600 hover:border hover:border-pink-600 md:w-10 md:h-10 sm:col-start-4 sm:row-start-5 md:col-start-5 md:row-start-3"
              onClick={() => handleRemoveProduct(product.productId)}
            >
              X
            </button>
          </li>
        ))}

        <div className="sm:justify-around  total flex justify-between pl-3 pr-3 items-center h-20 pb-2   md:justify-around lg:h-60 lg:justify-evenly">
          <p className="sm:text-sm text-lg text-pink-500 drop-shadow-xl  font-semibold md:text-2xl">
            Total del Carrito: ${totalCartPrice}
          </p>
          <button
            className=" flex justify-center w-22 h-10 text-xs font-medium rounded-md bg-red-700 text-white transition-all duration-500 ease-in-out hover:bg-transparent hover:border border-red-700 hover:text-black hover:scale-120-smooth sm:items-center sm:w-12 sm:h-12 md:w-28 md:h-30 lg:w-38 lg:h-38"
            onClick={() => handleClearCart()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="icon icon-tabler icon-tabler-shopping-cart-x sm:w-8 sm:h-8 md:w-10 md:h-10"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
              <path d="M13 17h-7v-14h-2" />
              <path d="M6 5l14 1l-1 7h-13" />
              <path d="M22 22l-5 -5" />
              <path d="M17 22l5 -5" />
            </svg>
          </button>
        </div>

        <div className=" flex flex-col justify-around items-center content-center pt-5 pb-5">
          <button
            className=" w-40 h-14 text-lg font-medium rounded-md bg-pink-500 text-white transition-all duration-500 ease-in-out hover:text-pink-500 hover:border hover:border-pink-500 hover:bg-pink-200 hover:scale-120-smooth"
            onClick={handleCheckout} //
          >
            Checkout
          </button>
        </div>
      </ul>
    </div>
  );
};

export default Cart;
