-- Add delivery_address column to the orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_address text DEFAULT ''::text;

-- Comment to explain the column
COMMENT ON COLUMN public.orders.delivery_address IS 'Stores the delivery address mapped by the user during checkout.';
